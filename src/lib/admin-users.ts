import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: Date;
  notesCount: number;
};

export function listUsersForAdmin(): AdminUserRow[] {
  const rows = db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      role: schema.user.role,
      createdAt: schema.user.createdAt,
      notesCount: sql<number>`(SELECT COUNT(*) FROM ${schema.voicenote} WHERE ${schema.voicenote.userId} = ${schema.user.id})`.as(
        "notes_count",
      ),
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt)
    .all();

  return rows.map((r) => ({
    ...r,
    role: r.role as "admin" | "user",
    notesCount: Number(r.notesCount),
  }));
}
