import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { Recorder } from "./recorder";

export const metadata = {
  title: "Nahrávanie",
};

export default async function RecordPage() {
  const session = await requireSession();
  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 md:py-12">
        <section className="section-head mb-2">
          <span className="eyebrow">02 · Záznam</span>
          <div className="flex flex-col gap-4">
            <h1 className="h-section">
              Stlač a <span className="italic-accent">hovor</span>.
            </h1>
            <p className="lead">
              Krátka poznámka, list rodine, rýchla myšlienka — Whisper to
              prepíše a spraví dostupné celej rodine ak chceš zdieľať.
            </p>
          </div>
        </section>
        <Recorder />
      </main>
    </>
  );
}
