import { requireAdmin } from "@/lib/server-auth";
import { listUsersForAdmin } from "@/lib/admin-users";
import { Topbar } from "@/components/topbar";
import { UsersTable } from "./users-table";

export const metadata = { title: "Členovia rodiny" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const users = listUsersForAdmin();

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 md:py-14">
        <section className="section-head">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">03 · Rodina</span>
            <span className="eyebrow-bare">
              {users.length} {users.length === 1 ? "člen" : "členov"}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="h-section">
              Členovia <span className="italic-accent">rodiny</span>.
            </h1>
            <p className="lead">
              Spravuj kto má prístup. Promote / demote rolu, alebo zmaž
              účet aj s jeho nahrávkami.
            </p>
          </div>
        </section>

        <UsersTable users={users} meId={session.user.id} />
      </main>
    </>
  );
}
