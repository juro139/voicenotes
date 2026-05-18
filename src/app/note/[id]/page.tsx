import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2, Share2 } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { getNoteForViewer, canEditNote } from "@/lib/notes";
import { Topbar } from "@/components/topbar";
import { AutoRefresh } from "@/components/auto-refresh";
import { NoteEditor } from "./note-editor";

export const dynamic = "force-dynamic";

function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Prepisujem",
  transcribed: "Prepísané",
  categorized: "Hotové",
};

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

  const title =
    note.summary ??
    (note.rawText
      ? note.rawText.split(/[.!?\n]/)[0].slice(0, 100) || "Bez názvu"
      : "Bez názvu");

  return (
    <>
      <Topbar user={session.user} />
      <AutoRefresh enabled={isPending} intervalMs={3000} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 md:py-10">
        <Link
          href="/"
          className="btn btn-ghost mb-6 -ml-1 inline-flex"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft className="btn-icon size-3.5" />
          <span className="btn-underline">Všetky poznámky</span>
        </Link>

        <section className="section-head !mb-8">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Záznam</span>
            <span className="eyebrow-bare">
              {STATUS_LABEL[note.status] ?? note.status}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1
              className="font-medium leading-[1.05]"
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                letterSpacing: "-0.03em",
              }}
            >
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-brand-fg-muted">
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
                  <span
                    className="flex items-center gap-1"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    <Share2 className="size-3.5" />
                    zdieľané
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="soft-card mb-8 p-4">
          <audio
            controls
            preload="metadata"
            className="w-full"
            src={`/api/audio/${note.id}`}
          />
        </div>

        {isPending && (
          <div
            className="soft-card mb-8 flex items-center gap-3"
            style={{
              borderColor: "var(--brand-warn)",
              background: "color-mix(in oklab, var(--brand-warn) 12%, transparent)",
            }}
          >
            <Loader2
              className="size-4 animate-spin"
              style={{ color: "var(--brand-warn)" }}
            />
            <div className="flex flex-col">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--brand-warn)" }}
              >
                Prepisujem na pozadí…
              </p>
              <p className="text-xs text-brand-fg-muted">
                Stránka sa sama obnoví, len čo Whisper skončí.
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
