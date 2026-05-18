import Link from "next/link";
import { ArrowUpRight, Mic, Share2, Tag, User as UserIcon } from "lucide-react";
import type { NoteListItem } from "@/lib/notes";

function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "teraz";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
}

const STATUS_LABEL: Record<NoteListItem["status"], string> = {
  pending: "Prepisujem",
  transcribed: "Prepísané",
  categorized: "Hotové",
};

function deriveTitle(note: NoteListItem): string {
  if (note.summary) return note.summary;
  if (note.rawTextPreview) {
    const firstSentence = note.rawTextPreview.split(/[.!?\n]/)[0].trim();
    if (firstSentence.length > 0) return firstSentence;
  }
  return note.status === "pending" ? "Nová nahrávka" : "Bez názvu";
}

export function NoteList({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <div className="soft-card flex flex-col items-center gap-4 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-accent-soft text-brand-accent">
          <Mic className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium">Zatiaľ <span className="italic-accent">nič</span></p>
          <p className="text-sm text-brand-fg-muted">
            Klikni na{" "}
            <Link
              href="/record"
              className="underline decoration-dotted underline-offset-4"
            >
              Record
            </Link>{" "}
            a nahraj prvú poznámku.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {notes.map((note, idx) => {
        const title = deriveTitle(note);
        const number = (idx + 1).toString().padStart(2, "0");
        return (
          <li key={note.id}>
            <Link href={`/note/${note.id}`} className="ed-card h-full">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-mono opacity-60"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {number} · {formatRelative(note.createdAt)} ·{" "}
                  {formatDuration(note.durationSeconds)}
                </span>
                <span
                  className="font-mono uppercase opacity-60"
                  style={{ letterSpacing: "0.1em", fontSize: "10px" }}
                >
                  {STATUS_LABEL[note.status]}
                </span>
              </div>

              <h3
                className="font-medium leading-[1.1] line-clamp-2"
                style={{ fontSize: "22px", letterSpacing: "-0.015em" }}
              >
                {title}
              </h3>

              {note.rawTextPreview && !note.summary && (
                <p
                  className="text-sm leading-snug opacity-75 line-clamp-3"
                  style={{ maxWidth: "36ch" }}
                >
                  {note.rawTextPreview}
                </p>
              )}

              <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                  {!note.mine && (
                    <span className="flex items-center gap-1">
                      <UserIcon className="size-3" />
                      {note.userName}
                    </span>
                  )}
                  {note.shared && note.mine && (
                    <span className="flex items-center gap-1">
                      <Share2 className="size-3" />
                      zdieľané
                    </span>
                  )}
                  {note.category && (
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {note.category}
                    </span>
                  )}
                </div>

                <span className="ed-card-arrow" aria-hidden>
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
