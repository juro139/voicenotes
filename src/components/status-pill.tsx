import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

type Status = "pending" | "transcribed" | "categorized";

const CONFIG: Record<
  Status,
  { label: string; classes: string; icon: typeof Loader2 }
> = {
  pending: {
    label: "Transcribing",
    classes:
      "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: Loader2,
  },
  transcribed: {
    label: "Transcribed",
    classes:
      "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    icon: Sparkles,
  },
  categorized: {
    label: "Done",
    classes:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
};

export function StatusPill({ status }: { status: Status }) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      <Icon
        className={`size-3.5 ${status === "pending" ? "animate-spin" : ""}`}
      />
      {cfg.label}
    </span>
  );
}
