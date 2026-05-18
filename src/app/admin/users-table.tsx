"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { AdminUserRow } from "@/lib/admin-users";

export function UsersTable({
  users,
  meId,
}: {
  users: AdminUserRow[];
  meId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function setRole(id: string, role: "admin" | "user") {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success("Rola aktualizovaná");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zmena zlyhala");
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (
      !confirm(
        `Zmazať ${name}? Aj všetky jeho nahrávky budú zmazané. Nedá sa vrátiť.`,
      )
    ) {
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success(`${name} odstránený`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zmazanie zlyhalo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {users.map((u) => {
        const isMe = u.id === meId;
        const isBusy = busy === u.id || pending;
        return (
          <li key={u.id} className="soft-card">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-1 min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  {isMe && <span className="tag">ty</span>}
                  <span
                    className={u.role === "admin" ? "tag tag-filled" : "tag"}
                  >
                    {u.role}
                  </span>
                </div>
                <span className="text-sm text-brand-fg-muted">{u.email}</span>
              </div>

              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: "22px", letterSpacing: "-0.01em" }}
                >
                  {u.notesCount}
                </span>
                <span className="eyebrow-bare" style={{ fontSize: "10px" }}>
                  {u.notesCount === 1 ? "poznámka" : "poznámok"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {u.role === "admin" ? (
                  <button
                    type="button"
                    disabled={isMe || isBusy}
                    onClick={() => setRole(u.id, "user")}
                    className="btn btn-secondary btn-sm"
                    title={isMe ? "Sám seba nepremiestniš" : "Premiestniť na user"}
                  >
                    <ShieldOff className="btn-icon size-3.5" />
                    Demote
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setRole(u.id, "admin")}
                    className="btn btn-secondary btn-sm"
                  >
                    <ShieldCheck className="btn-icon size-3.5" />
                    Promote
                  </button>
                )}
                <button
                  type="button"
                  disabled={isMe || isBusy}
                  onClick={() => deleteUser(u.id, u.name)}
                  className="icon-btn"
                  style={{ color: "var(--brand-warn)" }}
                  title={isMe ? "Sám seba nezmažeš" : "Zmazať"}
                  aria-label={`Zmazať ${u.name}`}
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
