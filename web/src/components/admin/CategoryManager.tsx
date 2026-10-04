"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, LayoutGrid, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { checkTelugu, checkText, collect, type FieldErrors } from "@/lib/menuValidation";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "@/store/useToastStore";

type ModalState = { category: Category | null } | null;

function CategoryModal({ state, nextSortOrder, onClose, onSaved }: { state: ModalState; nextSortOrder: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name_en: "", name_te: "", sort_order: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    const c = state.category;
    setForm({ name_en: c?.name_en ?? "", name_te: c?.name_te ?? "", sort_order: String(c?.sort_order ?? nextSortOrder) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;
  const editing = state.category;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = collect([
      ["name_en", checkText(form.name_en, "English name", 80)],
      ["name_te", checkTelugu(form.name_te, "Telugu name")],
      ["sort_order", /^\d{1,5}$/.test(form.sort_order.trim()) ? null : "Use a whole number, e.g. 10"],
    ]);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const body = { name_en: form.name_en.trim(), name_te: form.name_te.trim(), sort_order: Number(form.sort_order) };
      if (editing) await api.updateCategory(editing.id, body);
      else await api.createCategory(body);
      toast.success(editing ? `Category “${body.name_en}” updated` : `Category “${body.name_en}” added`, "Guest menus refresh automatically.");
      onSaved();
    } catch (err) {
      toast.error("Couldn't save the category", err instanceof ApiError ? err.message : err);
    } finally {
      setSaving(false);
    }
  };

  const field = (k: "name_en" | "name_te" | "sort_order", label: string, extra: Record<string, string> = {}) => (
    <div>
      <Label htmlFor={`cat-${k}`}>{label}</Label>
      <Input
        id={`cat-${k}`}
        {...extra}
        aria-invalid={Boolean(errors[k])}
        className={cn(errors[k] && "border-destructive")}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      />
      {errors[k] && <p className="mt-1 text-xs font-medium text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent aria-describedby="cat-modal-desc">
        <form onSubmit={submit} noValidate className="space-y-4 p-6">
          <div>
            <DialogTitle>{editing ? "Edit category" : "Add Category"}</DialogTitle>
            <DialogDescription id="cat-modal-desc">Lower sort order shows first on the guest menu.</DialogDescription>
          </div>
          {field("name_en", "Name (English)", { placeholder: "Weekend Specials" })}
          {field("name_te", "Name (Telugu)", { placeholder: "వీకెండ్ స్పెషల్స్", lang: "te" })}
          {field("sort_order", "Sort order", { inputMode: "numeric", placeholder: "10" })}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Spinner className="size-4 text-white" />} {editing ? "Save" : "Add category"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChanged: () => void;
};

/** Sidebar CMS for categories: add, rename, reorder (arrows), safe delete, and filter the dish table. */
export function CategoryManager({ categories, selectedId, onSelect, onChanged }: Props) {
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [order, setOrder] = useState<Category[]>(categories);
  const [reordering, setReordering] = useState(false);

  useEffect(() => setOrder(categories), [categories]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...order];
    const [c] = next.splice(index, 1);
    next.splice(index + dir, 0, c!);
    setOrder(next); // optimistic
    setReordering(true);
    try {
      await api.reorderCategories(next.map((x) => x.id));
      onChanged();
    } catch (err) {
      setOrder(categories);
      toast.error("Couldn't reorder categories", err);
    } finally {
      setReordering(false);
    }
  };

  const remove = async (c: Category) => {
    try {
      const res = await api.deleteCategory(c.id);
      toast.success(
        `Category “${c.name_en}” removed`,
        res.mode === "archived" ? "It only held archived dishes with sales history, so it was archived to keep reports intact." : undefined,
      );
      if (selectedId === c.id) onSelect(null);
      setToDelete(null);
      onChanged();
    } catch (err) {
      toast.error("Couldn't delete the category", err instanceof ApiError ? err.message : err);
      setToDelete(null);
    }
  };

  const total = order.reduce((n, c) => n + c.items.length, 0);
  const linked = toDelete?.items.length ?? 0;

  return (
    <aside aria-label="Categories" className="h-fit rounded-xl border bg-card shadow-sm lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-bold">Categories</h2>
        <Button size="sm" onClick={() => setModal({ category: null })}>
          <FolderPlus /> Add Category
        </Button>
      </div>
      <ul className="p-2">
        <li>
          <button
            onClick={() => onSelect(null)}
            aria-pressed={selectedId === null}
            className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold", selectedId === null ? "bg-primary/10 text-primary" : "hover:bg-muted")}
          >
            <LayoutGrid className="size-4" /> All dishes <span className="ml-auto text-xs text-muted-foreground">{total}</span>
          </button>
        </li>
        {order.map((c, i) => (
          <li key={c.id} className={cn("group flex items-center gap-1 rounded-lg pr-1", selectedId === c.id ? "bg-primary/10" : "hover:bg-muted")}>
            <button onClick={() => onSelect(c.id)} aria-pressed={selectedId === c.id} className="min-w-0 flex-1 px-3 py-2 text-left">
              <span className={cn("block truncate text-sm font-semibold", selectedId === c.id && "text-primary")}>{c.name_en}</span>
              <span className="block truncate text-xs text-muted-foreground" lang="te">{c.name_te} · {c.items.length} dish{c.items.length === 1 ? "" : "es"}</span>
            </button>
            <div className="flex shrink-0 items-center">
              <Button size="icon" variant="ghost" className="size-7" disabled={i === 0 || reordering} onClick={() => void move(i, -1)} aria-label={`Move ${c.name_en} up`}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" className="size-7" disabled={i === order.length - 1 || reordering} onClick={() => void move(i, 1)} aria-label={`Move ${c.name_en} down`}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setModal({ category: c })} aria-label={`Edit ${c.name_en}`}><Pencil /></Button>
              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name_en}`}><Trash2 /></Button>
            </div>
          </li>
        ))}
        {order.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No categories yet — add your first one.</li>}
      </ul>

      <CategoryModal
        state={modal}
        nextSortOrder={(order.at(-1)?.sort_order ?? 0) + 10}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          onChanged();
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete “${toDelete?.name_en ?? ""}”?`}
        description={<p>The category disappears from every guest menu immediately.</p>}
        blockedReason={
          linked > 0
            ? `${linked} dish${linked === 1 ? " is" : "es are"} still in this category. Move ${linked === 1 ? "it" : "them"} to another category (Edit dish → Category) or delete ${linked === 1 ? "it" : "them"} first.`
            : undefined
        }
        confirmLabel="Delete category"
        destructive
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </aside>
  );
}
