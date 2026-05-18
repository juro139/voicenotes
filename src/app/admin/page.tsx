import { requireAdmin } from "@/lib/server-auth";
import { listUsersForAdmin } from "@/lib/admin-users";
import { Topbar } from "@/components/topbar";
import { UsersTable } from "./users-table";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const users = listUsersForAdmin();

  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto max-w-4xl flex-1 w-full px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Family members
        </h1>
        <UsersTable users={users} meId={session.user.id} />
      </main>
    </>
  );
}
