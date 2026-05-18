"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mic,
  UserCircle2,
  LogOut,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { PWARegister } from "@/components/pwa-register";
import { ThemeToggle } from "@/components/theme-toggle";

type TopbarUser = {
  name: string;
  email: string;
  role: string;
};

export function Topbar({ user }: { user: TopbarUser }) {
  const isAdmin = user.role === "admin";

  async function onSignOut() {
    try {
      await signOut();
    } catch (err) {
      // Even if the request fails (network, CSRF mismatch, expired token),
      // wipe the client and force the user to /login — they'll log in fresh.
      console.error("[signOut] request failed:", err);
    }
    window.location.href = "/login";
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-brand-line"
      style={{
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
        background: "color-mix(in oklab, var(--brand-bg) 80%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5">
        <Link
          href="/"
          className="brand-mark-trigger flex items-center gap-2.5 text-[15px] font-medium tracking-tight"
        >
          <span className="brand-mark">
            <Mic className="size-3.5" />
          </span>
          voicenotes
        </Link>

        <span className="status-pill hidden sm:flex">
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
          <DropdownMenu>
            <DropdownMenuTrigger className="icon-btn" aria-label="Account">
              <UserCircle2 className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-56 border-brand-line-strong bg-card"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-brand-fg">
                    {user.name}
                  </span>
                  <span className="text-xs text-brand-fg-muted">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <span className="tag tag-filled w-fit mt-1">admin</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-brand-line" />
              {isAdmin && (
                <DropdownMenuItem render={<Link href="/admin" />}>
                  <Users className="size-4" />
                  Users
                  <ArrowUpRight className="ml-auto size-3.5 opacity-60" />
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
