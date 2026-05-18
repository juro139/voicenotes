"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      toast.success("Deleted");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (!editable) {
    return (
      <div className="flex flex-col gap-5">
        <ReadonlyField label="Summary" value={note.summary ?? "—"} />
        <ReadonlyField
          label="Transcript"
          value={note.rawText ?? "(transcribing in background…)"}
          multiline
        />
        <ReadonlyField label="Category" value={note.category ?? "—"} />
        <div>
          <Label className="mb-2 block">Tags</Label>
          <div className="flex flex-wrap gap-1">
            {note.tags.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              note.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="summary">Summary</Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short title or summary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rawText">Transcript</Label>
        <Textarea
          id="rawText"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={
            note.status === "pending"
              ? "Transcribing in background — will appear here…"
              : "Transcript"
          }
          rows={8}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. ideas, todo, family"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="tag1, tag2"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="shared" className="text-sm font-medium">
            Share with family
          </Label>
          <p className="text-xs text-muted-foreground">
            Other family members can read this note.
          </p>
        </div>
        <Switch id="shared" checked={shared} onCheckedChange={setShared} />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={onSave} disabled={saving || deleting}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save
            </>
          )}
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={saving || deleting}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Delete
        </Button>
      </div>
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      <p
        className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""} rounded-md border bg-muted/30 p-3`}
      >
        {value}
      </p>
    </div>
  );
}
