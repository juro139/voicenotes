import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { getNoteForViewer, canEditNote } from "@/lib/notes";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "./note-editor";

export const dynamic = "force-dynamic";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const isAdmin = session.user.role === "admin";
  const note = await getNoteForViewer(id, session.user.id, isAdmin);
  if (!note) notFound();

  const editable = canEditNote(note, session.user.id, isAdmin);

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto max-w-3xl flex-1 w-full px-4 py-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              All notes
            </Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight mb-1">
            {note.summary ?? "Untitled recording"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {note.userName} ·{" "}
            {note.createdAt.toLocaleString("sk-SK", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {note.durationSeconds.toFixed(1)}s
          </p>
        </div>

        <audio
          controls
          preload="metadata"
          className="w-full mb-6"
          src={`/api/audio/${note.id}`}
        />

        <NoteEditor note={note} editable={editable} />
      </main>
    </>
  );
}
