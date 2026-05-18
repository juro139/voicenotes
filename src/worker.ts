import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "medium";
const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";
const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/transcribe.py");
const AUDIO_DIR =
  process.env.AUDIO_DIR ?? path.resolve(process.cwd(), "data/audio");
const DRY_RUN = process.env.WHISPER_DRY_RUN === "1";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "whisper-large-v3";

type Backend = "dry-run" | "groq" | "python";

const BACKEND: Backend = DRY_RUN ? "dry-run" : GROQ_API_KEY ? "groq" : "python";

type TranscriptionResult = {
  text: string;
  language: string;
};

function log(...args: unknown[]) {
  console.log(`[worker ${new Date().toISOString()}]`, ...args);
}

const LANG_ALIASES: Record<string, "sk" | "en"> = {
  sk: "sk",
  slo: "sk",
  slovak: "sk",
  slovenčina: "sk",
  en: "en",
  eng: "en",
  english: "en",
};

function normalizeLang(raw: string | undefined): "sk" | "en" | null {
  if (!raw) return null;
  return LANG_ALIASES[raw.toLowerCase()] ?? null;
}

const MIME_FROM_EXT: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

async function transcribeViaGroq(audioPath: string): Promise<TranscriptionResult> {
  const ext = path.extname(audioPath).slice(1).toLowerCase();
  const mime = MIME_FROM_EXT[ext] ?? "application/octet-stream";
  const buf = await readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), path.basename(audioPath));
  form.append("model", GROQ_MODEL);
  form.append("response_format", "verbose_json");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { text: string; language?: string };
  return {
    text: data.text.trim(),
    language: data.language ?? "auto",
  };
}

async function transcribe(audioPath: string): Promise<TranscriptionResult> {
  if (BACKEND === "dry-run") {
    return {
      text: `[dry-run] mock transcript for ${path.basename(audioPath)}`,
      language: "auto",
    };
  }

  if (BACKEND === "groq") {
    return transcribeViaGroq(audioPath);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(
      PYTHON_BIN,
      [SCRIPT_PATH, "--model", WHISPER_MODEL, "--audio", audioPath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `transcribe.py exited ${code}: ${stderr.trim() || stdout.trim()}`,
          ),
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
        if (typeof parsed.text !== "string") {
          throw new Error("Invalid transcribe.py output");
        }
        resolve({
          text: parsed.text,
          language: typeof parsed.language === "string" ? parsed.language : "auto",
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}

async function processOne(): Promise<boolean> {
  const pending = db
    .select()
    .from(schema.voicenote)
    .where(eq(schema.voicenote.status, "pending"))
    .limit(1)
    .all();

  if (pending.length === 0) return false;
  const note = pending[0];
  const absPath = path.isAbsolute(note.audioPath)
    ? note.audioPath
    : path.join(AUDIO_DIR, note.audioPath);

  log(`transcribing ${note.id} (${note.audioPath})`);
  const started = Date.now();
  try {
    const result = await transcribe(absPath);
    const detectedLang = normalizeLang(result.language) ?? note.language;

    db.update(schema.voicenote)
      .set({
        rawText: result.text.trim(),
        language: detectedLang,
        status: "transcribed",
      })
      .where(eq(schema.voicenote.id, note.id))
      .run();

    log(
      `transcribed ${note.id} in ${((Date.now() - started) / 1000).toFixed(1)}s (${result.text.length} chars, lang=${detectedLang})`,
    );
  } catch (err) {
    log(`failed ${note.id}:`, err instanceof Error ? err.message : err);
    // Leave status='pending' so it retries next poll. In a real system we
    // would track failure count and dead-letter after N retries.
  }
  return true;
}

async function loop() {
  log(
    `start (backend=${BACKEND}, model=${BACKEND === "groq" ? GROQ_MODEL : WHISPER_MODEL}, poll=${POLL_MS}ms, audioDir=${AUDIO_DIR})`,
  );
  while (true) {
    let didWork = false;
    try {
      didWork = await processOne();
    } catch (err) {
      log("loop error:", err);
    }
    if (!didWork) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

loop().catch((err) => {
  log("fatal:", err);
  process.exit(1);
});
