import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-auth";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Register · voicenotes",
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <RegisterForm />
    </main>
  );
}
