import "dotenv/config";
import { spawn } from "node:child_process";
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

type TranscriptionResult = {
  text: string;
  language: string;
};

function log(...args: unknown[]) {
  console.log(`[worker ${new Date().toISOString()}]`, ...args);
}

async function transcribe(audioPath: string): Promise<TranscriptionResult> {
  if (DRY_RUN) {
    return {
      text: `[dry-run] mock transcript for ${path.basename(audioPath)}`,
      language: "auto",
    };
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
    const detectedLang =
      result.language === "sk" || result.language === "en"
        ? result.language
        : note.language;

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
    `start (model=${WHISPER_MODEL}, poll=${POLL_MS}ms, dryRun=${DRY_RUN}, audioDir=${AUDIO_DIR})`,
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
