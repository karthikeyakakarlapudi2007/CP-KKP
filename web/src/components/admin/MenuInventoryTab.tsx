"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FolderPlus, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DishImage } from "@/components/shared/DishImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { errorMessage, toggleAvailability } from "@/lib/staffActions";
import type { Category, MenuItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { ItemFormDialog } from "./ItemFormDialog";

export function MenuInventoryTab() {
  const staffKey = useStaffStore((s) => s.key);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set());
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: MenuItem | null; categoryId?: number }>({ open: false, item: null });
  const [catDialog, setCatDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    try {
      setCategories((await api.menu()).categories);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load menu"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => clearTimeout(noticeTimer.current);
  }, [load]);

  const patchItem = (id: number, patch: Partial<MenuItem>) =>
    setCategories((cats) => cats.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })));

  // Other admin screens stay in sync too
  useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.MENU_AVAILABILITY_TOGGLED]: (p: { menu_item_id: number; is_available: boolean }) =>
        patchItem(p.menu_item_id, { is_available: p.is_available }),
      [EVENTS.MENU_UPDATED]: () => void load(),
    },
    load,
  );

  const flash = (msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  };

  /** Optimistic: flip locally, send `menu:toggle_availability`, roll back if the server refuses. */
  const toggle = async (item: MenuItem, value: boolean) => {
    patchItem(item.id, { is_available: value });
    setPending((p) => new Set(p).add(item.id));
    const started = performance.now();
    try {
      await toggleAvailability(item.id, value);
      flash(`${item.name_en} is now ${value ? "available" : "out of stock"} on every guest phone (${Math.round(performance.now() - started)} ms)`);
    } catch (e) {
      patchItem(item.id, { is_available: !value });
      setError(errorMessage(e, "Toggle failed"));
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(item.id);
        return n;
      });
    }
  };

  const removeItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name_en}"? This cannot be undone.`)) return;
    try {
      await api.deleteItem(item.id);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Delete failed"));
    }
  };

  const removeCategory = async (c: Category) => {
    if (!confirm(`Delete category "${c.name_en}"?`)) return;
    try {
      await api.deleteCategory(c.id);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Delete failed"));
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => `${i.name_en} ${i.name_te}`.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length);
  }, [categories, query]);

  const all = categories.flatMap((c) => c.items);
  const outCount = all.filter((i) => !i.is_available).length;

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold">Menu & Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} dishes · <span className={cn(outCount > 0 && "font-bold text-destructive")}>{outCount} out of stock</span> · toggles reach every guest phone instantly
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Find a dish…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a dish" />
        </div>
        <Button variant="outline" onClick={() => setCatDialog({ open: true, category: null })}>
          <FolderPlus /> Category
        </Button>
        <Button onClick={() => setItemDialog({ open: true, item: null })} disabled={!categories.length}>
          <Plus /> Add New Dish
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex justify-between rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          {error}
          <button onClick={() => setError(null)} className="underline">Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="fixed bottom-6 right-6 z-40 flex animate-pop items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl">
          <CheckCircle2 className="size-4 text-success" /> {notice}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 font-semibold">Name (EN + TE)</th>
              <th className="py-3 font-semibold">Category</th>
              <th className="py-3 pr-6 text-right font-semibold">Price</th>
              <th className="py-3 font-semibold">Combo</th>
              <th className="py-3 font-semibold">Live availability</th>
              <th className="py-3 pr-4 text-right font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No dishes match “{query}”.</td></tr>
            )}
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b bg-muted/50">
                  <th colSpan={6} scope="colgroup" className="px-4 py-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{c.name_en}</span>
                      <span className="font-normal text-muted-foreground">· {c.name_te}</span>
                      <span className="text-xs font-normal text-muted-foreground">({c.items.length})</span>
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setItemDialog({ open: true, item: null, categoryId: c.id })}><Plus /> Dish</Button>
                        <Button size="icon" variant="ghost" aria-label={`Edit category ${c.name_en}`} onClick={() => setCatDialog({ open: true, category: c })}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label={`Delete category ${c.name_en}`} onClick={() => void removeCategory(c)}><Trash2 /></Button>
                      </div>
                    </div>
                  </th>
                </tr>
                {c.items.length === 0 && (
                  <tr className="border-b"><td colSpan={6} className="py-4 text-center text-muted-foreground">No dishes yet.</td></tr>
                )}
                {c.items.map((i) => (
                  <tr key={i.id} className={cn("border-b transition-colors last:border-0", !i.is_available && "bg-destructive/5")}>
                    <td className="py-2 pl-4">
                      <div className="flex items-center gap-3">
                        <DishImage src={i.image_url} className={cn("size-11 shrink-0 rounded-lg text-base", !i.is_available && "grayscale")} />
                        <div>
                          <p className="font-semibold">{i.name_en}</p>
                          <p className="text-muted-foreground" lang="te">{i.name_te}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-muted-foreground">{c.name_en}</td>
                    <td className="py-2 pr-6 text-right font-bold tabular-nums">{formatINR(i.price)}</td>
                    <td className="py-2">
                      {i.is_combo ? (
                        <Badge variant="accent"><Layers className="size-3" /> {i.combo_steps.length}-step combo</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <label className="flex w-fit cursor-pointer items-center gap-2">
                        <Switch
                          checked={i.is_available}
                          disabled={pending.has(i.id)}
                          onCheckedChange={(v) => void toggle(i, v)}
                          aria-label={`Availability for ${i.name_en}`}
                        />
                        <span className={cn("w-24 text-xs font-bold", i.is_available ? "text-success" : "text-destructive")}>
                          {i.is_available ? "In stock" : "Out of stock"}
                        </span>
                      </label>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Button size="icon" variant="ghost" aria-label={`Edit ${i.name_en}`} onClick={() => setItemDialog({ open: true, item: i })}><Pencil /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${i.name_en}`} onClick={() => void removeItem(i)}><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ItemFormDialog
        open={itemDialog.open}
        item={itemDialog.item}
        categories={categories}
        defaultCategoryId={itemDialog.categoryId}
        onClose={() => setItemDialog({ open: false, item: null })}
        onSaved={() => {
          const created = !itemDialog.item;
          setItemDialog({ open: false, item: null });
          void load();
          flash(created ? "Dish added — it's live on the guest menu" : "Dish updated");
        }}
      />
      <CategoryFormDialog
        open={catDialog.open}
        category={catDialog.category}
        nextSortOrder={(categories.at(-1)?.sort_order ?? 0) + 10}
        onClose={() => setCatDialog({ open: false, category: null })}
        onSaved={() => {
          setCatDialog({ open: false, category: null });
          void load();
        }}
      />
    </div>
  );
}
