import Link from "next/link";
import { Clock, Share2, Tag, User as UserIcon, Mic } from "lucide-react";
import type { NoteListItem } from "@/lib/notes";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status-pill";

function formatDuration(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

const ACCENT: Record<NoteListItem["status"], string> = {
  pending: "before:bg-amber-500",
  transcribed: "before:bg-sky-500",
  categorized: "before:bg-emerald-500",
};

export function NoteList({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <Mic className="size-7 text-muted-foreground" />
        </div>
        <p className="font-medium mb-1">No voice notes yet</p>
        <p className="text-sm text-muted-foreground">
          Tap{" "}
          <Link href="/record" className="underline decoration-dotted">
            Record
          </Link>{" "}
          to capture your first note.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/note/${note.id}`}
            className={`group relative block overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:border-foreground/20 hover:bg-card/60 hover:shadow-md before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${ACCENT[note.status]}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-medium leading-snug line-clamp-2 flex-1">
                {note.summary ??
                  (note.status === "pending"
                    ? "New recording"
                    : "Untitled recording")}
              </h3>
              <StatusPill status={note.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelative(note.createdAt)}
              </span>
              <span aria-hidden>·</span>
              <span>{formatDuration(note.durationSeconds)}</span>
              {!note.mine && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="size-3" />
                    {note.userName}
                  </span>
                </>
              )}
              {note.shared && note.mine && (
                <>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Share2 className="size-3" />
                    shared
                  </span>
                </>
              )}
            </div>

            {(note.category || note.tags.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {note.category && (
                  <Badge variant="outline" className="text-xs">
                    {note.category}
                  </Badge>
                )}
                {note.tags.length > 0 && (
                  <>
                    <Tag className="size-3 text-muted-foreground" />
                    {note.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-xs"
                      >
                        {t}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
