"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWARegister() {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Force an update check on every page load. If the deployed sw.js
          // differs from what's installed, the new copy is fetched and the
          // 'updatefound' listener flips waiting → active on the next nav.
          reg.update().catch(() => {});
          // If a new worker is already waiting (because the user reloaded
          // mid-rollout), poke it so it activates without a second reload.
          if (reg.waiting) {
            reg.waiting.postMessage("skip-waiting");
          }
          // When a new sw takes control of the page, hard-reload so the
          // freshly-built HTML/CSS bundle is used instead of stale cached
          // JS from a prior version of the SW.
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        })
        .catch((err) => console.error("[sw] register failed", err));
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      <Download className="btn-icon size-3.5" />
      Install
    </button>
  );
}
