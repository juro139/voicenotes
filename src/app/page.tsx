import Link from "next/link";
import { Mic } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { NoteList } from "@/components/note-list";
import { listNotesVisibleTo } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireSession();
  const notes = await listNotesVisibleTo(
    session.user.id,
    session.user.role === "admin",
  );

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto max-w-3xl flex-1 w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your voice notes
          </h1>
          <Button asChild>
            <Link href="/record">
              <Mic className="size-4" />
              New recording
            </Link>
          </Button>
        </div>
        <NoteList notes={notes} />
      </main>
    </>
  );
}
