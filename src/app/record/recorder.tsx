"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";

type State = "idle" | "requesting" | "recording" | "uploading";

const NUM_BARS = 11;

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

const STATE_LABEL: Record<State, string> = {
  idle: "Pripravené",
  requesting: "Žiadam o mikrofón",
  recording: "Nahrávam",
  uploading: "Ukladám",
};

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
        throw new Error(text || `Upload zlyhal (${res.status})`);
      }
      const data = (await res.json()) as { id: string };
      toast.success("Uložené");
      router.push(`/note/${data.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload zlyhal";
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
        err instanceof Error ? err.message : "Mikrofón odmietnutý";
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
    <div className="flex flex-col items-center gap-10 py-12">
      <div className="flex flex-col items-center gap-2">
        <span className="status-pill">
          {isRecording ? (
            <span
              className="dot"
              aria-hidden
              style={{ background: "var(--brand-warn)" }}
            />
          ) : (
            <span className="dot" aria-hidden />
          )}
          {STATE_LABEL[state]}
        </span>
        <div
          className="font-mono tabular-nums leading-none"
          style={{
            fontSize: "clamp(72px, 14vw, 128px)",
            letterSpacing: "-0.04em",
          }}
        >
          {formatTime(duration)}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {isRecording && (
          <>
            <span
              className="pointer-events-none absolute inset-0 rounded-full animate-ping"
              style={{
                background: "color-mix(in oklab, var(--brand-warn) 25%, transparent)",
              }}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute rounded-full animate-ping"
              style={{
                inset: "-32px",
                border: "1px solid color-mix(in oklab, var(--brand-warn) 50%, transparent)",
                animationDelay: "0.4s",
                animationDuration: "1.8s",
              }}
              aria-hidden
            />
          </>
        )}
        <button
          type="button"
          onClick={isRecording ? stop : start}
          disabled={isBusy}
          aria-label={isRecording ? "Zastaviť nahrávanie" : "Spustiť nahrávanie"}
          className="relative z-10 flex size-36 items-center justify-center rounded-full text-brand-bg shadow-[var(--shadow-md)] transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: isRecording ? "var(--brand-warn)" : "var(--brand-fg)",
          }}
        >
          {state === "requesting" || state === "uploading" ? (
            <Loader2 className="size-14 animate-spin" />
          ) : isRecording ? (
            <Square className="size-12 fill-current" />
          ) : (
            <Mic className="size-14" />
          )}
        </button>
      </div>

      <div
        className="flex h-24 w-full max-w-md items-center justify-center gap-1.5"
        aria-hidden
      >
        {bars.map((value, i) => (
          <div
            key={i}
            className="w-2 rounded-full"
            style={{
              height: `${Math.max(8, Math.min(100, value * 220))}%`,
              background: isRecording
                ? "var(--brand-accent)"
                : "var(--brand-line-strong)",
              opacity: isRecording ? 0.5 + value * 0.5 : 1,
              transition: "height 75ms linear, background var(--t-base) var(--ease)",
            }}
          />
        ))}
      </div>

      <p className="max-w-sm text-center text-sm leading-relaxed text-brand-fg-muted">
        {state === "idle" && "Klepni na mikrofón a začni hovoriť."}
        {state === "requesting" && "Povol prehliadaču prístup k mikrofónu…"}
        {state === "recording" && (
          <>
            Klepni na <span className="italic-accent">stop</span>, keď
            skončíš. Prepis vyrobí Whisper sám.
          </>
        )}
        {state === "uploading" && "Ukladám a odovzdávam na prepis…"}
      </p>
    </div>
  );
}
