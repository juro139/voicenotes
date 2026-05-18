import Link from "next/link";
import { Clock, Share2, Users, Tag } from "lucide-react";
import type { NoteListItem } from "@/lib/notes";
import { Badge } from "@/components/ui/badge";

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

export function NoteList({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">
          No notes yet. Tap{" "}
          <Link href="/record" className="underline">
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
            className="block rounded-lg border bg-card p-4 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatRelative(note.createdAt)}
                  </span>
                  <span>·</span>
                  <span>{formatDuration(note.durationSeconds)}</span>
                  {!note.mine && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {note.userName}
                      </span>
                    </>
                  )}
                  {note.shared && note.mine && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Share2 className="size-3" />
                        shared
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium line-clamp-2">
                  {note.summary ??
                    (note.status === "pending"
                      ? "Transcribing…"
                      : "(no summary yet)")}
                </p>
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Tag className="size-3 text-muted-foreground" />
                    {note.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {note.category && (
                  <Badge variant="outline">{note.category}</Badge>
                )}
                {note.status === "pending" && (
                  <Badge variant="secondary">pending</Badge>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
