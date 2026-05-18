import Link from "next/link";
import { Mic } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await requireSession();

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto max-w-5xl flex-1 w-full px-4 py-6">
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

        <div className="rounded-lg border border-dashed p-10 text-center">
          <Mic className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No notes yet. Tap{" "}
            <Link href="/record" className="underline">
              Record
            </Link>{" "}
            to capture your first note.
          </p>
        </div>
      </main>
    </>
  );
}
