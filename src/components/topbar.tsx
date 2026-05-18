import Link from "next/link";
import { Mic, UserCircle2 } from "lucide-react";
import { PWARegister } from "@/components/pwa-register";
import { ThemeToggle } from "@/components/theme-toggle";

type TopbarUser = {
  name: string;
  email: string;
  role: string;
};

export function Topbar({ user: _user }: { user: TopbarUser }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-brand-line"
      style={{
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
        background: "color-mix(in oklab, var(--brand-bg) 80%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className="brand-mark-trigger flex items-center gap-2.5 text-[15px] font-medium tracking-tight"
        >
          <span className="brand-mark">
            <Mic className="size-3.5" />
          </span>
          voicenotes
        </Link>

        <span className="status-pill hidden md:flex">
          <span className="dot" aria-hidden />
          Live
        </span>

        <div className="ml-auto flex items-center gap-2">
          <PWARegister />
          <ThemeToggle />
          <Link href="/record" className="btn btn-primary btn-sm">
            <Mic className="btn-icon size-3.5" />
            Record
          </Link>
          <Link
            href="/profile"
            className="icon-btn"
            aria-label="Účet"
            title="Účet a odhlásenie"
          >
            <UserCircle2 className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
