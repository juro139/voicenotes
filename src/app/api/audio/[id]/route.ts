import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { getNoteForViewer } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTENT_TYPE: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const note = await getNoteForViewer(
    id,
    session.user.id,
    session.user.role === "admin",
  );
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const audioDir =
    process.env.AUDIO_DIR ?? path.resolve(process.cwd(), "data/audio");
  const filePath = path.isAbsolute(note.audioPath)
    ? note.audioPath
    : path.join(audioDir, note.audioPath);

  // Defense in depth — make sure the resolved path stays under audioDir.
  const resolvedDir = path.resolve(audioDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(resolvedFile);
    if (!info.isFile()) throw new Error("not a file");
    const ext = path.extname(resolvedFile).slice(1).toLowerCase();
    const body = await readFile(resolvedFile);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Content-Length": info.size.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
