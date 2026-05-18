"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? "Prihlásenie zlyhalo");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="eyebrow">voicenotes</span>
        <h1
          className="font-medium leading-[1.0]"
          style={{ fontSize: "clamp(40px, 6vw, 64px)", letterSpacing: "-0.03em" }}
        >
          Vitaj <span className="italic-accent">späť</span>.
        </h1>
        <p className="text-brand-fg-muted">Prihlás sa, aby si pokračoval.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="eyebrow-bare">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card border-brand-line-strong h-11 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="eyebrow-bare">
            Heslo
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-card border-brand-line-strong h-11 text-base"
          />
        </div>

        {error && (
          <p
            className="text-sm"
            style={{ color: "var(--brand-warn)" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <Loader2 className="btn-icon size-4 animate-spin" />
          ) : (
            <ArrowUpRight className="btn-icon size-4" />
          )}
          {loading ? "Prihlasujem…" : "Prihlásiť sa"}
        </button>
      </form>

      <p className="text-sm text-brand-fg-muted">
        Bez účtu?{" "}
        <Link
          href="/register"
          className="text-brand-fg underline decoration-dotted underline-offset-4"
        >
          Registrovať
        </Link>
      </p>
    </div>
  );
}
