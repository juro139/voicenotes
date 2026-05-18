import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Účet" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const isAdmin = session.user.role === "admin";

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 md:py-12">
        <Link
          href="/"
          className="btn btn-ghost mb-6 -ml-1 inline-flex"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft className="btn-icon size-3.5" />
          <span className="btn-underline">Späť na poznámky</span>
        </Link>

        <section className="section-head !mb-8">
          <span className="eyebrow">Účet</span>
          <div className="flex flex-col gap-3">
            <h1
              className="font-medium leading-[1.05]"
              style={{
                fontSize: "clamp(32px, 5vw, 48px)",
                letterSpacing: "-0.03em",
              }}
            >
              {session.user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-brand-fg-muted">
                {session.user.email}
              </span>
              <span className={isAdmin ? "tag tag-filled" : "tag"}>
                {isAdmin ? "admin" : "user"}
              </span>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="soft-card flex items-center justify-between gap-3 hover:border-brand-line-strong transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-accent-soft text-brand-accent">
                  <Users className="size-4" />
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">Členovia rodiny</span>
                  <span className="text-sm text-brand-fg-muted">
                    Spravuj prístup a role
                  </span>
                </div>
              </div>
              <span className="eyebrow-bare">otvoriť →</span>
            </Link>
          )}

          <div className="soft-card">
            <div className="flex flex-col gap-2 mb-4">
              <span className="eyebrow-bare">Odhlásenie</span>
              <p className="text-sm text-brand-fg-muted">
                Ukončí túto reláciu a presmeruje na prihlásenie.
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </main>
    </>
  );
}
