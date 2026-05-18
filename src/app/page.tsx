import Link from "next/link";
import { Mic, ArrowUpRight } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
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
  const transcribedCount = notes.filter(
    (n) => n.status !== "pending",
  ).length;

  return (
    <>
      <Topbar user={session.user} />
      <AutoRefresh enabled={hasPending} intervalMs={4000} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:py-14">
        <section className="section-head">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">01 · Záznamy</span>
            <span className="eyebrow-bare">
              {notes.length} {notes.length === 1 ? "poznámka" : "poznámok"}
              {hasPending && " · prepisujem"}
            </span>
          </div>
          <div className="flex flex-col gap-5">
            <h1 className="h-section">
              Vaše hlasové <span className="italic-accent">poznámky</span>.
            </h1>
            <p className="lead">
              Všetko čo rodina nahrala. Klikni na záznam pre prepis, úpravy
              a zdieľanie. Nové poznámky sa prepisujú automaticky.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/record" className="btn btn-primary">
                <Mic className="btn-icon size-4" />
                Nový záznam
                <ArrowUpRight className="btn-icon size-4" />
              </Link>
              {transcribedCount > 0 && (
                <span className="status-pill">
                  <span className="dot" aria-hidden />
                  {transcribedCount} pripravené
                </span>
              )}
            </div>
          </div>
        </section>

        <NoteList notes={notes} />
      </main>
    </>
  );
}
