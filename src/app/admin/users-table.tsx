"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      toast.success(`Role updated`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (
      !confirm(
        `Delete ${name}? Their voice notes will also be deleted. Cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      toast.success(`${name} removed`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium text-right">Notes</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = u.id === meId;
            const isBusy = busy === u.id || pending;
            return (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  {u.name}
                  {isMe && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      you
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "admin" ? "default" : "outline"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {u.notesCount}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {u.role === "admin" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isMe || isBusy}
                        onClick={() => setRole(u.id, "user")}
                        title={isMe ? "Can't demote yourself" : "Demote"}
                      >
                        <ShieldOff className="size-4" />
                        Demote
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => setRole(u.id, "admin")}
                      >
                        <ShieldCheck className="size-4" />
                        Promote
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isMe || isBusy}
                      onClick={() => deleteUser(u.id, u.name)}
                      title={isMe ? "Can't delete yourself" : "Delete"}
                    >
                      {isBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
