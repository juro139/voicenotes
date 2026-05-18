"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { NoteFull } from "@/lib/notes";

export function NoteEditor({
  note,
  editable,
}: {
  note: NoteFull;
  editable: boolean;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(note.summary ?? "");
  const [rawText, setRawText] = useState(note.rawText ?? "");
  const [category, setCategory] = useState(note.category ?? "");
  const [tagsInput, setTagsInput] = useState(note.tags.join(", "));
  const [shared, setShared] = useState(note.shared);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary || null,
          rawText: rawText || null,
          category: category || null,
          tags,
          shared,
        }),
      });
      if (!res.ok) throw new Error(`Uloženie zlyhalo (${res.status})`);
      toast.success("Uložené");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uloženie zlyhalo");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Zmazať túto poznámku? Nedá sa vrátiť.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Zmazanie zlyhalo (${res.status})`);
      toast.success("Zmazané");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zmazanie zlyhalo");
      setDeleting(false);
    }
  }

  if (!editable) {
    return (
      <div className="flex flex-col gap-5">
        <Section eyebrow="Súhrn">
          <p className="whitespace-pre-wrap text-base">
            {note.summary ?? "—"}
          </p>
        </Section>
        <Section eyebrow="Prepis">
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {note.rawText ?? "(prepisujem na pozadí…)"}
          </p>
        </Section>
        {note.category && (
          <Section eyebrow="Kategória">
            <span className="tag">{note.category}</span>
          </Section>
        )}
        {note.tags.length > 0 && (
          <Section eyebrow="Tagy">
            <div className="flex flex-wrap gap-2">
              {note.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Field eyebrow="Súhrn" label="Krátky názov alebo zhrnutie">
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="napr. Nákupný zoznam"
          className="bg-card border-brand-line-strong text-base h-11"
        />
      </Field>

      <Field eyebrow="Prepis" label="Doslovný prepis nahrávky">
        <Textarea
          id="rawText"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={
            note.status === "pending"
              ? "Prepisujem na pozadí — text sa tu objaví automaticky…"
              : "Prepis"
          }
          rows={8}
          className="bg-card border-brand-line-strong text-base leading-relaxed"
        />
      </Field>

      <Field eyebrow="Kategória" label="Voľný textový štítok">
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="napr. nápady, rodina, todo"
          className="bg-card border-brand-line-strong text-base h-11"
        />
      </Field>

      <Field eyebrow="Tagy" label="Oddelené čiarkou">
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="tag1, tag2"
          className="bg-card border-brand-line-strong text-base h-11"
        />
      </Field>

      <div className="soft-card flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="shared" className="text-sm font-medium">
            Zdieľať s rodinou
          </Label>
          <p className="text-xs text-brand-fg-muted">
            Ostatní členovia uvidia túto poznámku.
          </p>
        </div>
        <Switch id="shared" checked={shared} onCheckedChange={setShared} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || deleting}
          className="btn btn-primary"
        >
          {saving ? (
            <Loader2 className="btn-icon size-4 animate-spin" />
          ) : (
            <Save className="btn-icon size-4" />
          )}
          {saving ? "Ukladám…" : "Uložiť"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving || deleting}
          className="btn btn-ghost"
          style={{ color: "var(--brand-warn)" }}
        >
          {deleting ? (
            <Loader2 className="btn-icon size-4 animate-spin" />
          ) : (
            <Trash2 className="btn-icon size-4" />
          )}
          <span className="btn-underline">Zmazať</span>
        </button>
      </div>
    </div>
  );
}

function Field({
  eyebrow,
  label,
  children,
}: {
  eyebrow: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="eyebrow-bare">{eyebrow}</span>
        {label && (
          <span className="text-xs text-brand-fg-subtle">{label}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow-bare">{eyebrow}</span>
      <div className="soft-card">{children}</div>
    </div>
  );
}
