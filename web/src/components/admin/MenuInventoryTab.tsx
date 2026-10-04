"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DishImage } from "@/components/shared/DishImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useSocket } from "@/hooks/useSocket";
import { api, ApiError } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { errorMessage, toggleAvailability } from "@/lib/staffActions";
import type { Category, MenuItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { toast } from "@/store/useToastStore";
import { CategoryManager } from "./CategoryManager";
import { MenuItemModal } from "./MenuItemModal";

export function MenuInventoryTab() {
  const staffKey = useStaffStore((s) => s.key);
  /** everything incl. archived rows (staff view) */
  const [all, setAll] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set());
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [modal, setModal] = useState<{ item: MenuItem | null; categoryId?: number } | null>(null);
  const [toDelete, setToDelete] = useState<MenuItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      setAll((await api.menuWithArchived()).categories);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Failed to load the menu"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** live categories with only live dishes — what guests see */
  const categories = useMemo(
    () => all.filter((c) => !c.archived_at).map((c) => ({ ...c, items: c.items.filter((i) => !i.archived_at) })),
    [all],
  );
  const archived = useMemo(() => all.flatMap((c) => c.items.filter((i) => i.archived_at).map((i) => ({ ...i, categoryName: c.name_en }))), [all]);

  const patchItem = (id: number, patch: Partial<MenuItem>) =>
    setAll((cats) => cats.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })));

  // other admin screens / tabs stay in sync
  useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.MENU_AVAILABILITY_TOGGLED]: (p: { menu_item_id: number; is_available: boolean }) => patchItem(p.menu_item_id, { is_available: p.is_available }),
      [EVENTS.MENU_UPDATED]: () => void load(),
    },
    load,
  );

  const toggle = async (item: MenuItem, value: boolean) => {
    patchItem(item.id, { is_available: value });
    setPending((p) => new Set(p).add(item.id));
    try {
      await toggleAvailability(item.id, value);
      toast.success(`${item.name_en} is now ${value ? "in stock" : "out of stock"}`, "Updated on every guest phone.");
    } catch (e) {
      patchItem(item.id, { is_available: !value });
      toast.error(`Couldn't update ${item.name_en}`, e);
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(item.id);
        return n;
      });
    }
  };

  const removeItem = async (item: MenuItem) => {
    try {
      const res = await api.deleteItem(item.id);
      if (res.mode === "archived") {
        toast.success(`“${item.name_en}” archived`, `It appears on ${res.order_lines} past order line${res.order_lines === 1 ? "" : "s"}, so it was hidden instead of erased — sales history stays intact. Restore it any time below.`);
      } else {
        toast.success(`“${item.name_en}” deleted`);
      }
      setToDelete(null);
      await load();
    } catch (e) {
      toast.error(`Couldn't delete “${item.name_en}”`, e instanceof ApiError ? e.message : e);
      setToDelete(null);
    }
  };

  const restore = async (item: MenuItem) => {
    try {
      await api.restoreItem(item.id);
      toast.success(`“${item.name_en}” restored`, "It's back on the menu as Out of stock — switch it on when ready.");
      await load();
    } catch (e) {
      toast.error(`Couldn't restore “${item.name_en}”`, e);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => selectedCat === null || c.id === selectedCat)
      .map((c) => ({ ...c, items: q ? c.items.filter((i) => `${i.name_en} ${i.name_te}`.toLowerCase().includes(q)) : c.items }))
      .filter((c) => c.items.length > 0 || (!q && selectedCat === c.id));
  }, [categories, query, selectedCat]);

  const dishes = categories.flatMap((c) => c.items);
  const outCount = dishes.filter((i) => !i.is_available).length;

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold">Menu & Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {dishes.length} dishes in {categories.length} categories · <span className={cn(outCount > 0 && "font-bold text-destructive")}>{outCount} out of stock</span> · every change goes live instantly
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Find a dish…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a dish" />
        </div>
        <Button onClick={() => setModal({ item: null, categoryId: selectedCat ?? undefined })} disabled={!categories.length}>
          <Plus /> Add New Dish
        </Button>
      </div>

      {loadError && (
        <div role="alert" className="flex justify-between rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          {loadError}
          <button onClick={() => void load()} className="underline">Retry</button>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
        <CategoryManager categories={categories} selectedId={selectedCat} onSelect={setSelectedCat} onChanged={() => void load()} />

        <div className="space-y-5">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-4 font-semibold">Dish (EN + TE)</th>
                  <th className="py-3 pr-6 text-right font-semibold">Price</th>
                  <th className="py-3 font-semibold">Combo</th>
                  <th className="py-3 font-semibold">Live availability</th>
                  <th className="py-3 pr-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">{query ? `No dishes match “${query}”.` : "No dishes yet — add your first one."}</td></tr>
                )}
                {visible.map((c) => (
                  <CategoryRows key={c.id} category={c} pending={pending} onToggle={toggle} onEdit={(i) => setModal({ item: i })} onDelete={setToDelete} onAdd={() => setModal({ item: null, categoryId: c.id })} />
                ))}
              </tbody>
            </table>
          </div>

          {archived.length > 0 && (
            <section className="rounded-xl border bg-card shadow-sm">
              <button onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold">
                <Archive className="size-4 text-muted-foreground" /> Archived dishes ({archived.length})
                <span className="text-xs font-normal text-muted-foreground">— hidden from guests, kept for order history</span>
                <ChevronDown className={cn("ml-auto size-4 transition-transform", showArchived && "rotate-180")} />
              </button>
              {showArchived && (
                <ul className="divide-y border-t">
                  {archived.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <DishImage src={i.image_url} className="size-9 shrink-0 rounded-lg text-sm grayscale" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-muted-foreground line-through decoration-1">{i.name_en}</p>
                        <p className="text-xs text-muted-foreground">{i.categoryName} · archived {new Date(i.archived_at!).toLocaleDateString("en-IN")}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void restore(i)}><ArchiveRestore /> Restore</Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <MenuItemModal
        state={modal}
        categories={categories}
        onClose={() => setModal(null)}
        onSaved={(item, mode) => {
          setModal(null);
          toast.success(mode === "created" ? `“${item.name_en}” added to the menu` : `“${item.name_en}” saved`, "Guest menus refresh automatically.");
          void load();
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete “${toDelete?.name_en ?? ""}”?`}
        description={
          <>
            <p>It disappears from every guest menu immediately.</p>
            <p>If it was ever ordered, it is <b>archived</b> instead of erased, so past bills and sales analytics stay correct. You can restore archived dishes later.</p>
          </>
        }
        confirmLabel="Delete dish"
        destructive
        onConfirm={() => (toDelete ? removeItem(toDelete) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function CategoryRows({
  category: c,
  pending,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  category: Category;
  pending: ReadonlySet<number>;
  onToggle: (i: MenuItem, v: boolean) => void;
  onEdit: (i: MenuItem) => void;
  onDelete: (i: MenuItem) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <tr className="border-b bg-muted/50">
        <th colSpan={5} scope="colgroup" className="px-4 py-2 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold">{c.name_en}</span>
            <span className="font-normal text-muted-foreground" lang="te">· {c.name_te}</span>
            <span className="text-xs font-normal text-muted-foreground">({c.items.length})</span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={onAdd}><Plus /> Dish</Button>
          </div>
        </th>
      </tr>
      {c.items.length === 0 && (
        <tr className="border-b"><td colSpan={5} className="py-4 text-center text-muted-foreground">No dishes in this category yet.</td></tr>
      )}
      {c.items.map((i) => (
        <tr key={i.id} data-dish={i.name_en} className={cn("border-b transition-colors last:border-0", !i.is_available && "bg-destructive/5")}>
          <td className="py-2 pl-4">
            <div className="flex items-center gap-3">
              <DishImage src={i.image_url} className={cn("size-11 shrink-0 rounded-lg text-base", !i.is_available && "grayscale")} />
              <div>
                <p className="font-semibold">{i.name_en}</p>
                <p className="text-muted-foreground" lang="te">{i.name_te}</p>
              </div>
            </div>
          </td>
          <td className="py-2 pr-6 text-right font-bold tabular-nums">{formatINR(i.price)}</td>
          <td className="py-2">
            {i.is_combo ? <Badge variant="accent"><Layers className="size-3" /> {i.combo_steps.length}-step combo</Badge> : <span className="text-xs text-muted-foreground">—</span>}
          </td>
          <td className="py-2">
            <label className="flex w-fit cursor-pointer items-center gap-2">
              <Switch checked={i.is_available} disabled={pending.has(i.id)} onCheckedChange={(v) => onToggle(i, v)} aria-label={`Availability for ${i.name_en}`} />
              <span className={cn("w-24 text-xs font-bold", i.is_available ? "text-success" : "text-destructive")}>{i.is_available ? "In stock" : "Out of stock"}</span>
            </label>
          </td>
          <td className="py-2 pr-4">
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => onEdit(i)} aria-label={`Edit ${i.name_en}`}><Pencil /> Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(i)} aria-label={`Delete ${i.name_en}`}><Trash2 /> Delete</Button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
