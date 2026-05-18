import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (id === session.user.id)
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 },
    );

  const audioDir =
    process.env.AUDIO_DIR ?? path.resolve(process.cwd(), "data/audio");

  // Collect audio paths before cascade
  const notes = db
    .select({ audioPath: schema.voicenote.audioPath })
    .from(schema.voicenote)
    .where(eq(schema.voicenote.userId, id))
    .all();

  const result = db
    .delete(schema.user)
    .where(eq(schema.user.id, id))
    .run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  for (const note of notes) {
    const filePath = path.isAbsolute(note.audioPath)
      ? note.audioPath
      : path.join(audioDir, note.audioPath);
    await unlink(filePath).catch(() => {});
  }

  return NextResponse.json({ ok: true, removedNotes: notes.length });
}
