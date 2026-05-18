"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await signOut();
    } catch (err) {
      console.error("[signOut] failed:", err);
    }
    // Hard-navigate so any cached server-component data tied to the now-
    // invalid cookie is discarded.
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? (
        <Loader2 className="btn-icon size-4 animate-spin" />
      ) : (
        <LogOut className="btn-icon size-4" />
      )}
      {loading ? "Odhlasujem…" : "Odhlásiť sa"}
    </button>
  );
}
