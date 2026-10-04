"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DishImage } from "@/components/shared/DishImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useSocket } from "@/hooks/useSocket";
import { api, ApiError } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import type { Category, MenuItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { ItemFormDialog } from "./ItemFormDialog";

export function MenuManager() {
  const staffKey = useStaffStore((s) => s.key);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: MenuItem | null; categoryId?: number }>({ open: false, item: null });
  const [catDialog, setCatDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });

  const load = useCallback(async () => {
    try {
      setCategories((await api.menu()).categories);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchItem = (id: number, patch: Partial<MenuItem>) =>
    setCategories((cats) => cats.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })));

  // Keep several admin screens in sync
  useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.MENU_AVAILABILITY_TOGGLED]: (p: { menu_item_id: number; is_available: boolean }) => patchItem(p.menu_item_id, { is_available: p.is_available }),
      [EVENTS.MENU_UPDATED]: () => void load(),
    },
    load,
  );

  const toggle = async (item: MenuItem, value: boolean) => {
    patchItem(item.id, { is_available: value }); // optimistic
    setPending((p) => new Set(p).add(item.id));
    try {
      await api.toggleAvailability(item.id, value);
    } catch (e) {
      patchItem(item.id, { is_available: !value });
      setError(e instanceof ApiError ? e.message : "Toggle failed");
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
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  const removeCategory = async (c: Category) => {
    if (!confirm(`Delete category "${c.name_en}"?`)) return;
    try {
      await api.deleteCategory(c.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => `${i.name_en} ${i.name_te}`.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length);
  }, [categories, query]);

  const outCount = categories.reduce((n, c) => n + c.items.filter((i) => !i.is_available).length, 0);
  const nextSort = (categories.at(-1)?.sort_order ?? 0) + 10;

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold">Menu & Inventory</h1>
          <p className="text-sm text-muted-foreground">Availability toggles reach every guest phone instantly. {outCount > 0 && <b className="text-destructive">{outCount} item(s) out of stock.</b>}</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Find a dish…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setCatDialog({ open: true, category: null })}><Plus /> Category</Button>
        <Button onClick={() => setItemDialog({ open: true, item: null })} disabled={!categories.length}><Plus /> Dish</Button>
      </div>

      {error && (
        <div role="alert" className="flex justify-between rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          {error}
          <button onClick={() => setError(null)} className="underline">Dismiss</button>
        </div>
      )}

      {filtered.map((c) => (
        <section key={c.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
            <h2 className="font-bold">{c.name_en}</h2>
            <span className="text-muted-foreground">· {c.name_te}</span>
            <span className="ml-2 text-xs text-muted-foreground">sort {c.sort_order}</span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setItemDialog({ open: true, item: null, categoryId: c.id })}><Plus /> Dish</Button>
              <Button size="icon" variant="ghost" aria-label="Edit category" onClick={() => setCatDialog({ open: true, category: c })}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete category" onClick={() => void removeCategory(c)}><Trash2 /></Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {c.items.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-muted-foreground">No dishes in this category yet.</td></tr>
              )}
              {c.items.map((i) => (
                <tr key={i.id} className={cn("border-b last:border-0", !i.is_available && "bg-muted/40")}>
                  <td className="w-16 py-2 pl-4">
                    <DishImage src={i.image_url} className="size-11 rounded-lg text-base" />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2 font-semibold">
                      {i.name_en}
                      {i.is_combo && <Badge variant="accent"><Layers className="size-3" /> {i.combo_steps.length}-step combo</Badge>}
                    </div>
                    <div className="text-muted-foreground">{i.name_te}</div>
                  </td>
                  <td className="w-28 py-2 text-right font-bold tabular-nums">{formatINR(i.price)}</td>
                  <td className="w-44 py-2 pl-6">
                    <label className="flex items-center gap-2">
                      <Switch checked={i.is_available} disabled={pending.has(i.id)} onCheckedChange={(v) => void toggle(i, v)} aria-label={`Availability for ${i.name_en}`} />
                      <span className={cn("text-xs font-bold", i.is_available ? "text-success" : "text-destructive")}>
                        {i.is_available ? "In stock" : "Out of stock"}
                      </span>
                    </label>
                  </td>
                  <td className="w-24 py-2 pr-4 text-right">
                    <Button size="icon" variant="ghost" aria-label={`Edit ${i.name_en}`} onClick={() => setItemDialog({ open: true, item: i })}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${i.name_en}`} onClick={() => void removeItem(i)}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <ItemFormDialog
        open={itemDialog.open}
        item={itemDialog.item}
        categories={categories}
        defaultCategoryId={itemDialog.categoryId}
        onClose={() => setItemDialog({ open: false, item: null })}
        onSaved={() => {
          setItemDialog({ open: false, item: null });
          void load();
        }}
      />
      <CategoryFormDialog
        open={catDialog.open}
        category={catDialog.category}
        nextSortOrder={nextSort}
        onClose={() => setCatDialog({ open: false, category: null })}
        onSaved={() => {
          setCatDialog({ open: false, category: null });
          void load();
        }}
      />
    </div>
  );
}
