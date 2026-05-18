import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { ownedNote } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  summary: z.string().max(500).nullable().optional(),
  rawText: z.string().max(50_000).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  language: z.enum(["sk", "en", "auto"]).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  shared: z.boolean().optional(),
});

async function authorize(noteId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Unauthorized", status: 401 as const };
  const isAdmin = session.user.role === "admin";
  const note = ownedNote(noteId, session.user.id, isAdmin);
  if (!note) return { error: "Not found", status: 404 as const };
  return { session, note, isAdmin };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorize(id);
  if ("error" in authz)
    return NextResponse.json({ error: authz.error }, { status: authz.status });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  // If user provided edits to a still-pending note, mark it transcribed.
  if (
    authz.note.status === "pending" &&
    typeof parsed.data.rawText === "string" &&
    parsed.data.rawText.length > 0
  ) {
    patch.status = "transcribed";
  }

  db.update(schema.voicenote)
    .set(patch)
    .where(eq(schema.voicenote.id, id))
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorize(id);
  if ("error" in authz)
    return NextResponse.json({ error: authz.error }, { status: authz.status });

  const audioDir =
    process.env.AUDIO_DIR ?? path.resolve(process.cwd(), "data/audio");
  const filePath = path.isAbsolute(authz.note.audioPath)
    ? authz.note.audioPath
    : path.join(audioDir, authz.note.audioPath);

  db.delete(schema.voicenote).where(eq(schema.voicenote.id, id)).run();
  await unlink(filePath).catch(() => {});

  return NextResponse.json({ ok: true });
}
