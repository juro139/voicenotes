"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";

type State = "idle" | "requesting" | "recording" | "uploading";

const NUM_BARS = 9;

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
  const [bars, setBars] = useState<number[]>(() =>
    new Array(NUM_BARS).fill(0),
  );

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
    setBars(new Array(NUM_BARS).fill(0));
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
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const bandSize = Math.floor(data.length / NUM_BARS);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next = new Array(NUM_BARS).fill(0);
        for (let b = 0; b < NUM_BARS; b++) {
          let sum = 0;
          for (let i = 0; i < bandSize; i++) {
            sum += data[b * bandSize + i] ?? 0;
          }
          next[b] = sum / bandSize / 255;
        }
        setBars(next);
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

  const buttonColor = isRecording
    ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30";

  return (
    <div className="flex flex-col items-center gap-10 py-12">
      <div className="flex flex-col items-center gap-1">
        <div className="text-6xl sm:text-7xl font-mono tabular-nums tracking-tight">
          {formatTime(duration)}
        </div>
        <div
          className={`text-xs font-medium uppercase tracking-widest ${
            isRecording ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {state === "idle" && "ready"}
          {state === "requesting" && "asking for microphone"}
          {state === "recording" && "● recording"}
          {state === "uploading" && "uploading"}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {isRecording && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-red-500/25 animate-ping pointer-events-none"
              aria-hidden
            />
            <span
              className="absolute -inset-6 rounded-full border-2 border-red-500/40 animate-ping pointer-events-none"
              style={{ animationDelay: "0.4s", animationDuration: "1.8s" }}
              aria-hidden
            />
          </>
        )}
        <button
          type="button"
          onClick={isRecording ? stop : start}
          disabled={isBusy}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          className={`relative z-10 flex size-36 items-center justify-center rounded-full text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
        >
          {state === "requesting" || state === "uploading" ? (
            <Loader2 className="size-14 animate-spin" />
          ) : isRecording ? (
            <Square className="size-12 fill-white" />
          ) : (
            <Mic className="size-14" />
          )}
        </button>
      </div>

      <div
        className="flex h-20 w-full max-w-sm items-center justify-center gap-1.5"
        aria-hidden
      >
        {bars.map((value, i) => (
          <div
            key={i}
            className={`w-2 rounded-full transition-all duration-75 ease-out ${
              isRecording ? "bg-emerald-500" : "bg-muted"
            }`}
            style={{
              height: `${Math.max(8, Math.min(100, value * 220))}%`,
              opacity: isRecording ? 0.5 + value * 0.5 : 1,
            }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {state === "idle" && "Tap the mic to start recording."}
        {state === "requesting" && "Waiting for microphone permission…"}
        {state === "recording" && "Tap the square to stop and save."}
        {state === "uploading" && "Uploading — almost there."}
      </p>
    </div>
  );
}
