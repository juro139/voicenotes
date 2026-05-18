import Link from "next/link";
import { Mic } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { NoteList } from "@/components/note-list";
import { AutoRefresh } from "@/components/auto-refresh";
import { listNotesVisibleTo } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const notes = await listNotesVisibleTo(
    session.user.id,
    session.user.role === "admin",
  );
  const hasPending = notes.some((n) => n.status === "pending");

  return (
    <>
      <Topbar user={session.user} />
      <AutoRefresh enabled={hasPending} intervalMs={4000} />
      <main className="mx-auto max-w-3xl flex-1 w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your voice notes
            </h1>
            <p className="text-sm text-muted-foreground">
              {notes.length === 0
                ? "Nothing here yet."
                : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
              {hasPending && " · transcribing in background"}
            </p>
          </div>
          <Button asChild>
            <Link href="/record">
              <Mic className="size-4" />
              New
            </Link>
          </Button>
        </div>
        <NoteList notes={notes} />
      </main>
    </>
  );
}
