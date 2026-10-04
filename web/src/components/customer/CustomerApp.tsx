"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Search, WifiOff, X } from "lucide-react";
import { ErrorView } from "@/components/shared/ErrorView";
import { FullScreenLoader } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/useSocket";
import { api, ApiError } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { t } from "@/lib/i18n";
import type { Category, MenuItem, Order, TableStatus } from "@/lib/types";
import { cn, pick } from "@/lib/utils";
import { useCart } from "@/stores/cart";
import { useLang } from "@/stores/lang";
import { CartBar } from "./CartBar";
import { CartDrawer } from "./CartDrawer";
import { ComboBuilder } from "./ComboBuilder";
import { LangToggle } from "./LangToggle";
import { MenuItemCard } from "./MenuItemCard";
import { OrderTracker } from "./OrderTracker";

type LoadState = "loading" | "ready" | "invalid-table" | "error";

export function CustomerApp({ tableRef }: { tableRef: string }) {
  const lang = useLang((s) => s.lang);
  const cart = useCart();

  const [state, setState] = useState<LoadState>("loading");
  const [tableId, setTableId] = useState<number | null>(null);
  const [tableStatus, setTableStatus] = useState<TableStatus>("vacant");
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<"menu" | "orders">("menu");
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [comboItem, setComboItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshMenu = useCallback(async () => {
    const { categories } = await api.menu();
    setCategories(categories);
  }, []);

  const refreshOrders = useCallback(async (id: number) => {
    const res = await api.tableOrders(id);
    setOrders(res.orders);
    setTableStatus(res.table.status);
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const table = await api.table(tableRef);
      setTableId(table.id);
      setTableStatus(table.status);
      useCart.getState().bindTable(table.id);
      await Promise.all([refreshMenu(), refreshOrders(table.id)]);
      setState("ready");
    } catch (e) {
      setState(e instanceof ApiError && (e.status === 404 || e.status === 400) ? "invalid-table" : "error");
    }
  }, [tableRef, refreshMenu, refreshOrders]);

  useEffect(() => {
    void load();
  }, [load]);

  // Drop cart lines that are no longer orderable (e.g. toggled off while the guest browsed)
  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  useEffect(() => {
    if (!allItems.length) return;
    const unavailable = new Set(allItems.filter((i) => !i.is_available).map((i) => i.id));
    const known = new Set(allItems.map((i) => i.id));
    const gone = cart.lines.filter((l) => unavailable.has(l.menu_item_id) || !known.has(l.menu_item_id)).map((l) => l.menu_item_id);
    if (gone.length) {
      cart.removeItems(gone);
      showToast(t("itemsWentOos", lang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems]);

  const upsertOrder = useCallback((o: Order) => {
    setOrders((prev) => {
      const active = o.status === "pending" || o.status === "preparing" || o.status === "served";
      const rest = prev.filter((p) => p.id !== o.id);
      return active ? [...rest, o].sort((a, b) => a.created_at.localeCompare(b.created_at)) : rest;
    });
  }, []);

  const { connected } = useSocket(
    tableId ? { role: "customer", table: tableId } : null,
    {
      [EVENTS.MENU_AVAILABILITY_TOGGLED]: (p: { menu_item_id: number; is_available: boolean }) =>
        setCategories((cats) =>
          cats.map((c) => ({
            ...c,
            items: c.items.map((i) => (i.id === p.menu_item_id ? { ...i, is_available: p.is_available } : i)),
          })),
        ),
      [EVENTS.MENU_UPDATED]: () => void refreshMenu().catch(() => undefined),
      [EVENTS.ORDER_CREATED]: upsertOrder,
      [EVENTS.ORDER_STATUS_CHANGED]: upsertOrder,
      [EVENTS.TABLE_UPDATED]: (p: { status: TableStatus }) => setTableStatus(p.status),
      [EVENTS.TABLE_BILL_REQUESTED]: () => setTableStatus("bill_requested"),
    },
    () => {
      if (tableId) void Promise.all([refreshMenu(), refreshOrders(tableId)]).catch(() => undefined);
    },
  );

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => activeCat === "all" || c.id === activeCat || q)
      .map((c) => ({
        ...c,
        items: q
          ? c.items.filter((i) =>
              [i.name_en, i.name_te, i.description_en ?? "", i.description_te ?? ""].some((s) => s.toLowerCase().includes(q)),
            )
          : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, activeCat, query]);

  const qtyInCart = (id: number) => cart.lines.find((l) => l.key === String(id))?.quantity ?? 0;

  const handleAdd = (item: MenuItem) => {
    if (!item.is_available) return;
    if (item.is_combo) setComboItem(item);
    else cart.add(item);
  };

  const placeOrder = async () => {
    if (!tableId || placing) return;
    setPlacing(true);
    setOrderError(null);
    try {
      const order = await api.placeOrder({
        table_number: tableId,
        customer_notes: cart.notes.trim() || null,
        items: cart.lines.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, combo_selections: l.combo_selections })),
      });
      upsertOrder(order);
      cart.clear();
      setCartOpen(false);
      setView("orders");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const ids = (e.details as { unavailable_item_ids?: number[] } | undefined)?.unavailable_item_ids ?? [];
        if (ids.length) {
          cart.removeItems(ids);
          setOrderError(t("itemsWentOos", lang));
          void refreshMenu().catch(() => undefined);
          return;
        }
      }
      setOrderError(e instanceof ApiError && e.status !== 0 && e.status < 500 ? e.message : t("orderFailed", lang));
    } finally {
      setPlacing(false);
    }
  };

  const requestBill = async () => {
    if (!tableId) return;
    setRequestingBill(true);
    try {
      await api.requestBill(tableId);
      setTableStatus("bill_requested");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t("orderFailed", lang));
    } finally {
      setRequestingBill(false);
    }
  };

  if (state === "loading") return <FullScreenLoader />;
  if (state === "invalid-table") return <ErrorView title={t("invalidTable", "en")} message={t("invalidTable", "te")} />;
  if (state === "error" || !tableId) return <ErrorView title={t("loadError", "en")} message={t("loadError", "te")} onRetry={load} />;

  const liveOrders = orders.length;

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight text-primary">{t("appName", lang)}</h1>
            <p className="text-xs font-semibold text-muted-foreground">
              {t("table", lang)} #{tableId}
            </p>
          </div>
          <LangToggle />
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {(["menu", "orders"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition",
                view === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {v === "menu" ? "Menu / మెనూ" : <><ClipboardList className="size-4" /> {t("trackOrders", lang)}</>}
              {v === "orders" && liveOrders > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] text-white">{liveOrders}</span>
              )}
            </button>
          ))}
        </div>

        {view === "menu" && (
          <>
            <div className="relative px-4 pt-3">
              <Search className="pointer-events-none absolute left-7 top-1/2 mt-1.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder", lang)} className="rounded-full pl-9 pr-9" aria-label={t("searchPlaceholder", lang)} />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-7 top-1/2 mt-1.5 -translate-y-1/2" aria-label="Clear search">
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3" aria-label="Categories">
              {[{ id: "all" as const, label: t("all", lang) }, ...categories.map((c) => ({ id: c.id, label: pick(c, "name", lang) }))].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                    activeCat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </nav>
          </>
        )}
        {!connected && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 py-1 text-xs font-semibold text-amber-900">
            <WifiOff className="size-3" /> {t("offline", lang)}
          </div>
        )}
      </header>

      {view === "menu" ? (
        <main className="space-y-6 px-4 pb-32 pt-4">
          {visibleCategories.length === 0 && <p className="py-12 text-center text-muted-foreground">{t("noResults", lang)}</p>}
          {visibleCategories.map((c) => (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <h2 id={`cat-${c.id}`} className="mb-3 text-lg font-extrabold">{pick(c, "name", lang)}</h2>
              <div className="grid gap-3">
                {c.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    lang={lang}
                    inCart={qtyInCart(item.id)}
                    onAdd={() => handleAdd(item)}
                    onDecrement={() => cart.decrement(String(item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
          <CartBar lang={lang} onOpen={() => { setOrderError(null); setCartOpen(true); }} />
        </main>
      ) : (
        <OrderTracker
          lang={lang}
          orders={orders}
          tableStatus={tableStatus}
          requestingBill={requestingBill}
          onRequestBill={requestBill}
          onOrderMore={() => setView("menu")}
        />
      )}

      <ComboBuilder
        item={comboItem}
        lang={lang}
        onClose={() => setComboItem(null)}
        onAdd={(item, selections, steps, unitPrice) => {
          cart.add(item, { selections, steps, unitPrice });
          setComboItem(null);
        }}
      />
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        lang={lang}
        tableId={tableId}
        placing={placing}
        error={orderError}
        onPlaceOrder={placeOrder}
      />

      {toast && (
        <div role="status" className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-md rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
