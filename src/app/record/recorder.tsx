"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "requesting" | "recording" | "uploading";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

function fileNameFor(mimeType: string): string {
  if (mimeType.includes("webm")) return "recording.webm";
  if (mimeType.includes("mp4")) return "recording.m4a";
  if (mimeType.includes("ogg")) return "recording.ogg";
  return "recording.bin";
}

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Recorder() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const finalDurationRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function upload(blob: Blob) {
    setState("uploading");
    try {
      const form = new FormData();
      form.append("audio", blob, fileNameFor(blob.type));
      form.append("duration", finalDurationRef.current.toString());
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as { id: string };
      toast.success("Recording saved");
      router.push(`/note/${data.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setState("idle");
    }
  }

  async function start() {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setLevel(sum / data.length / 255);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const mime = pickMime();
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        finalDurationRef.current = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        cleanup();
        void upload(blob);
      };

      startedAtRef.current = Date.now();
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startedAtRef.current) / 1000);
      }, 100);

      recorder.start();
      setState("recording");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      toast.error(message);
      setState("idle");
      cleanup();
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  const isRecording = state === "recording";
  const isBusy = state === "requesting" || state === "uploading";

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-5xl font-mono tabular-nums tracking-tight">
        {formatTime(duration)}
      </div>

      <div className="relative">
        {isRecording && (
          <span
            className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
            aria-hidden
          />
        )}
        <Button
          type="button"
          size="lg"
          onClick={isRecording ? stop : start}
          disabled={isBusy}
          className={`size-32 rounded-full text-white shadow-lg ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {state === "requesting" || state === "uploading" ? (
            <Loader2 className="size-12 animate-spin" />
          ) : isRecording ? (
            <Square className="size-12 fill-white" />
          ) : (
            <Mic className="size-12" />
          )}
        </Button>
      </div>

      <div className="h-3 w-64 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-75"
          style={{ width: `${Math.min(100, level * 100 * 1.5)}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {state === "idle" && "Tap to start recording."}
        {state === "requesting" && "Waiting for microphone…"}
        {state === "recording" && "Recording — tap stop when done."}
        {state === "uploading" && "Uploading and saving…"}
      </p>
    </div>
  );
}
