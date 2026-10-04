"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { api, ApiError, type CategoryInput } from "@/lib/api";
import type { Category } from "@/lib/types";

export function CategoryFormDialog({
  open,
  category,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CategoryInput>({ name_en: "", name_te: "", sort_order: nextSortOrder });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(category ? { name_en: category.name_en, name_te: category.name_te, sort_order: category.sort_order } : { name_en: "", name_te: "", sort_order: nextSortOrder });
  }, [open, category, nextSortOrder]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, sort_order: Number(form.sort_order) };
      if (category) await api.updateCategory(category.id, body);
      else await api.createCategory(body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby="cat-form-desc">
        <form onSubmit={submit} className="space-y-4 p-6">
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription id="cat-form-desc">Lower sort order appears first on the guest menu.</DialogDescription>
          <div className="space-y-1">
            <Label htmlFor="c_en">Name (English)</Label>
            <Input id="c_en" required value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c_te">పేరు (తెలుగు)</Label>
            <Input id="c_te" required value={form.name_te} onChange={(e) => setForm({ ...form, name_te: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c_sort">Sort order</Label>
            <Input id="c_sort" type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
