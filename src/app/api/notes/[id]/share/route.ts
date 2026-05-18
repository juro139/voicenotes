import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { ownedNote } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({ shared: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const note = ownedNote(id, session.user.id, isAdmin);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  db.update(schema.voicenote)
    .set({ shared: parsed.data.shared })
    .where(eq(schema.voicenote.id, id))
    .run();

  return NextResponse.json({ ok: true, shared: parsed.data.shared });
}
