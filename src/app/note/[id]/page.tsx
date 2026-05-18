import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2, Share2 } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { getNoteForViewer, canEditNote } from "@/lib/notes";
import { Topbar } from "@/components/topbar";
import { buttonVariants } from "@/components/ui/button";
import { AutoRefresh } from "@/components/auto-refresh";
import { StatusPill } from "@/components/status-pill";
import { NoteEditor } from "./note-editor";

export const dynamic = "force-dynamic";

function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

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
  const isPending = note.status === "pending";

  return (
    <>
      <Topbar user={session.user} />
      <AutoRefresh enabled={isPending} intervalMs={3000} />
      <main className="mx-auto max-w-3xl flex-1 w-full px-4 py-6">
        <div className="mb-4">
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="size-3.5" />
            All notes
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-card/40 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {note.summary ??
                (note.rawText
                  ? note.rawText.split(/[.!?\n]/)[0].slice(0, 80) ||
                    "Untitled recording"
                  : "Untitled recording")}
            </h1>
            <StatusPill status={note.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{note.userName}</span>
            <span aria-hidden>·</span>
            <span>
              {note.createdAt.toLocaleString("sk-SK", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatDuration(note.durationSeconds)}
            </span>
            {note.shared && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1 text-emerald-500">
                  <Share2 className="size-3.5" />
                  shared
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4 mb-6">
          <audio
            controls
            preload="metadata"
            className="w-full"
            src={`/api/audio/${note.id}`}
          />
        </div>

        {isPending && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 dark:text-amber-200">
            <Loader2 className="size-4 animate-spin" />
            <div>
              <p className="font-medium">Transcribing in background…</p>
              <p className="text-xs opacity-80">
                This page will refresh automatically once it's done.
              </p>
            </div>
          </div>
        )}

        <NoteEditor
          key={`${note.id}-${note.status}-${note.rawText?.length ?? 0}`}
          note={note}
          editable={editable}
        />
      </main>
    </>
  );
}
