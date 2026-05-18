import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024;

const EXT_FROM_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

function extFor(blob: Blob, fallbackName: string | undefined): string {
  const fromMime = EXT_FROM_MIME[blob.type];
  if (fromMime) return fromMime;
  if (fallbackName) {
    const m = fallbackName.match(/\.([a-z0-9]{1,5})$/i);
    if (m) return m[1].toLowerCase();
  }
  return "bin";
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const durationRaw = form.get("duration");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  const duration = Number(durationRaw);
  if (!Number.isFinite(duration) || duration < 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const audioDir =
    process.env.AUDIO_DIR ?? path.resolve(process.cwd(), "data/audio");
  await mkdir(audioDir, { recursive: true });

  const id = randomUUID();
  const filename =
    audio instanceof File && audio.name ? audio.name : undefined;
  const ext = extFor(audio, filename);
  const storedName = `${id}.${ext}`;
  const storedPath = path.join(audioDir, storedName);

  const buffer = Buffer.from(await audio.arrayBuffer());
  await writeFile(storedPath, buffer);

  await db.insert(schema.voicenote).values({
    id,
    userId: session.user.id,
    audioPath: storedName,
    durationSeconds: duration,
    language: "auto",
    tags: [],
    shared: false,
    status: "pending",
    createdAt: new Date(),
  });

  return NextResponse.json({ id }, { status: 201 });
}
