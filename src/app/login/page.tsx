import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Prihlásenie",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
