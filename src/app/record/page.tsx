import { requireSession } from "@/lib/server-auth";
import { Topbar } from "@/components/topbar";
import { Recorder } from "./recorder";

export const metadata = {
  title: "Record",
};

export default async function RecordPage() {
  const session = await requireSession();
  return (
    <>
      <Topbar user={session.user} />
      <main className="mx-auto max-w-xl flex-1 w-full px-4">
        <Recorder />
      </main>
    </>
  );
}
