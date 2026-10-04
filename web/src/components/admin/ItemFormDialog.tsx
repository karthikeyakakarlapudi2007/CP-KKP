"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, ApiError, type MenuItemInput } from "@/lib/api";
import type { Category, MenuItem } from "@/lib/types";
import { ComboStepsEditor, emptyStep, type EditableStep } from "./ComboStepsEditor";

type Props = {
  open: boolean;
  item: MenuItem | null; // null = create
  categories: Category[];
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: () => void;
};

const blank = (categoryId: number): MenuItemInput => ({
  category_id: categoryId,
  name_en: "",
  name_te: "",
  description_en: "",
  description_te: "",
  price: 0,
  image_url: "",
  is_available: true,
  is_combo: false,
  combo_steps: [],
});

export function ItemFormDialog({ open, item, categories, defaultCategoryId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<MenuItemInput>(blank(defaultCategoryId ?? categories[0]?.id ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      item
        ? {
            category_id: item.category_id,
            name_en: item.name_en,
            name_te: item.name_te,
            description_en: item.description_en ?? "",
            description_te: item.description_te ?? "",
            price: item.price,
            image_url: item.image_url ?? "",
            is_available: item.is_available,
            is_combo: item.is_combo,
            combo_steps: item.combo_steps.map(({ id: _id, ...s }) => s),
          }
        : blank(defaultCategoryId ?? categories[0]?.id ?? 0),
    );
  }, [open, item, categories, defaultCategoryId]);

  const set = <K extends keyof MenuItemInput>(k: K, v: MenuItemInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: MenuItemInput = {
      ...form,
      price: Number(form.price),
      combo_steps: form.is_combo ? form.combo_steps : [],
    };
    try {
      if (item) await api.updateItem(item.id, body);
      else await api.createItem(body);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        const d = err.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
        const fields = d?.fieldErrors ? Object.entries(d.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`) : [];
        setError([err.message, ...(d?.formErrors ?? []), ...fields].join(" · "));
      } else setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" aria-describedby="item-form-desc">
        <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
          <div className="border-b p-5 pr-12">
            <DialogTitle>{item ? `Edit: ${item.name_en}` : "Add a new dish"}</DialogTitle>
            <DialogDescription id="item-form-desc">Bilingual names show to guests based on their language toggle.</DialogDescription>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name_en">Name (English)</Label>
                <Input id="name_en" required value={form.name_en} onChange={(e) => set("name_en", e.target.value)} placeholder="Gongura Mutton Biryani" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name_te">పేరు (తెలుగు)</Label>
                <Input id="name_te" required value={form.name_te} onChange={(e) => set("name_te", e.target.value)} placeholder="గోంగూర మటన్ బిర్యానీ" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="desc_en">Description (English)</Label>
                <Textarea id="desc_en" className="min-h-16" value={form.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="desc_te">వివరణ (తెలుగు)</Label>
                <Textarea id="desc_te" className="min-h-16" value={form.description_te ?? ""} onChange={(e) => set("description_te", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Select id="category" value={form.category_id} onChange={(e) => set("category_id", Number(e.target.value))}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_en} / {c.name_te}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="price">{form.is_combo ? "Base price (₹)" : "Price (₹)"}</Label>
                <Input id="price" type="number" min={0} step="0.01" required value={form.price} onChange={(e) => set("price", e.target.value as unknown as number)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="image">Image URL</Label>
                <div className="flex gap-3">
                  <Input id="image" type="url" value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image_url} alt="Preview" className="size-10 shrink-0 rounded-lg object-cover" />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={form.is_available} onCheckedChange={(v) => set("is_available", v)} /> Available
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch
                  checked={form.is_combo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_combo: v, combo_steps: v && !f.combo_steps?.length ? [emptyStep(1)] : f.combo_steps }))}
                />
                Combo (step-by-step builder)
              </label>
            </div>
            {form.is_combo && (
              <ComboStepsEditor steps={(form.combo_steps ?? []) as EditableStep[]} onChange={(s) => set("combo_steps", s)} />
            )}
          </div>
          <div className="space-y-2 border-t p-4">
            {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save changes" : "Add dish"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
