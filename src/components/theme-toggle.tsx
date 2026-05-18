"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "voicenotes-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
    setIsDark(next);
  }

  // Render placeholder until hydrated so server/client markup matches.
  if (isDark === null) {
    return (
      <button
        type="button"
        className="icon-btn"
        aria-label="Toggle theme"
        aria-hidden
      >
        <Sun className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
