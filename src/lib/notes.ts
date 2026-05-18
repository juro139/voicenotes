import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";

export type NoteListItem = {
  id: string;
  userId: string;
  userName: string;
  createdAt: Date;
  durationSeconds: number;
  language: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  shared: boolean;
  status: "pending" | "transcribed" | "categorized";
  mine: boolean;
};

export type NoteFull = NoteListItem & {
  audioPath: string;
  rawText: string | null;
};

export async function listNotesVisibleTo(
  userId: string,
  isAdmin: boolean,
): Promise<NoteListItem[]> {
  const where = isAdmin
    ? undefined
    : or(
        eq(schema.voicenote.userId, userId),
        eq(schema.voicenote.shared, true),
      );

  const rows = db
    .select({
      id: schema.voicenote.id,
      userId: schema.voicenote.userId,
      userName: schema.user.name,
      createdAt: schema.voicenote.createdAt,
      durationSeconds: schema.voicenote.durationSeconds,
      language: schema.voicenote.language,
      summary: schema.voicenote.summary,
      category: schema.voicenote.category,
      tags: schema.voicenote.tags,
      shared: schema.voicenote.shared,
      status: schema.voicenote.status,
    })
    .from(schema.voicenote)
    .innerJoin(schema.user, eq(schema.user.id, schema.voicenote.userId))
    .where(where)
    .orderBy(desc(schema.voicenote.createdAt))
    .all();

  return rows.map((r) => ({ ...r, mine: r.userId === userId }));
}

export async function getNoteForViewer(
  noteId: string,
  userId: string,
  isAdmin: boolean,
): Promise<NoteFull | null> {
  const rows = db
    .select({
      id: schema.voicenote.id,
      userId: schema.voicenote.userId,
      userName: schema.user.name,
      audioPath: schema.voicenote.audioPath,
      createdAt: schema.voicenote.createdAt,
      durationSeconds: schema.voicenote.durationSeconds,
      language: schema.voicenote.language,
      rawText: schema.voicenote.rawText,
      summary: schema.voicenote.summary,
      category: schema.voicenote.category,
      tags: schema.voicenote.tags,
      shared: schema.voicenote.shared,
      status: schema.voicenote.status,
    })
    .from(schema.voicenote)
    .innerJoin(schema.user, eq(schema.user.id, schema.voicenote.userId))
    .where(eq(schema.voicenote.id, noteId))
    .limit(1)
    .all();

  if (rows.length === 0) return null;
  const r = rows[0];
  const mine = r.userId === userId;
  if (!isAdmin && !mine && !r.shared) return null;
  return { ...r, mine };
}

export function canEditNote(
  note: { userId: string },
  userId: string,
  isAdmin: boolean,
): boolean {
  return isAdmin || note.userId === userId;
}

export function ownedNote(noteId: string, userId: string, isAdmin: boolean) {
  const where = isAdmin
    ? eq(schema.voicenote.id, noteId)
    : and(
        eq(schema.voicenote.id, noteId),
        eq(schema.voicenote.userId, userId),
      );
  return db
    .select()
    .from(schema.voicenote)
    .where(where)
    .limit(1)
    .all()[0] ?? null;
}
