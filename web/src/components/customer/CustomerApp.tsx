"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorView } from "@/components/shared/ErrorView";
import { FullScreenLoader } from "@/components/ui/spinner";
import { useSocket } from "@/hooks/useSocket";
import { useTranslation } from "@/hooks/useTranslation";
import { api, ApiError, type CreateOrderBody } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { CommandError, sendCommand } from "@/lib/socketClient";
import { translate } from "@/lib/translations";
import type { Category, MenuItem, Order, TableStatus } from "@/lib/types";
import { pick } from "@/lib/utils";
import { toComboSelections, useCustomerStore } from "@/store/useCustomerStore";
import { CartDrawer } from "./CartDrawer";
import { CategoryNav } from "./CategoryNav";
import { ComboBuilderModal } from "./ComboBuilderModal";
import { ActiveOrderBanner } from "./ActiveOrderBanner";
import { ConnectionPill } from "./ConnectionPill";
import { CustomerHeader } from "./CustomerHeader";
import { MenuItemCard } from "./MenuItemCard";
import { OrderTracker } from "./OrderTracker";

type LoadState = "loading" | "ready" | "invalid-table" | "error";

/** Socket first; REST only when the socket is offline (never after a sent-but-unanswered command). */
async function viaSocketOrRest<T>(event: string, payload: unknown, rest: () => Promise<T>): Promise<T> {
  try {
    return await sendCommand<T>(event, payload);
  } catch (e) {
    if (e instanceof CommandError && e.status === 0) return rest();
    throw e;
  }
}

const unavailableIds = (e: unknown): number[] => {
  const details = e instanceof CommandError || e instanceof ApiError ? e.details : undefined;
  return (details as { unavailable_item_ids?: number[] } | undefined)?.unavailable_item_ids ?? [];
};

export function CustomerApp({ tableRef }: { tableRef: string }) {
  const { t, lang } = useTranslation();
  const tableNumber = useCustomerStore((s) => s.tableNumber);
  const cart = useCustomerStore((s) => s.cart);
  const activeOrder = useCustomerStore((s) => s.activeOrder);

  const [state, setState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<"menu" | "status">("menu");
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [comboItem, setComboItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stickyRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<number, HTMLElement>());
  const spyLockUntil = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /* ---------------- data ---------------- */

  const refreshMenu = useCallback(async () => {
    setCategories((await api.menu()).categories);
  }, []);

  const refreshOrders = useCallback(async (table: number) => {
    const res = await api.tableOrders(table);
    useCustomerStore.getState().syncTable(res.orders, res.table.status);
    return res.orders;
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const table = await api.table(tableRef);
      useCustomerStore.getState().setTableNumber(table.id);
      // an active table order shows as a banner above the menu, so a second guest can add Round 2
      await Promise.all([refreshMenu(), refreshOrders(table.id)]);
      setState("ready");
    } catch (e) {
      setState(e instanceof ApiError && (e.status === 404 || e.status === 400) ? "invalid-table" : "error");
    }
  }, [tableRef, refreshMenu, refreshOrders]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every menu change (stock toggle, staff edits via menu:updated, a stale persisted cart) re-validates
  // and re-prices the cart so what the guest sees always matches what the kitchen will charge.
  useEffect(() => {
    if (!categories.length) return;
    const { removed, repriced } = useCustomerStore.getState().reconcileCart(categories.flatMap((c) => c.items));
    const language = useCustomerStore.getState().language;
    if (removed > 0) showToast(translate("cartItemsChanged", language));
    else if (repriced > 0) showToast(translate("cartRepriced", language));
  }, [categories, showToast]);

  /* ---------------- realtime ---------------- */

  useSocket(
    tableNumber && state === "ready" ? { role: "customer", table: tableNumber } : null,
    {
      [EVENTS.MENU_AVAILABILITY_TOGGLED]: (p: { menu_item_id: number; is_available: boolean }) =>
        setCategories((cats) =>
          cats.map((c) => ({ ...c, items: c.items.map((i) => (i.id === p.menu_item_id ? { ...i, is_available: p.is_available } : i)) })),
        ),
      [EVENTS.MENU_UPDATED]: () => void refreshMenu().catch(() => undefined),
      [EVENTS.ORDER_CREATED]: (o: Order) => useCustomerStore.getState().applyOrder(o),
      [EVENTS.ORDER_ADDON_CREATED]: (o: Order) => useCustomerStore.getState().applyOrder(o),
      [EVENTS.ORDER_STATUS_CHANGED]: (o: Order) => {
        const store = useCustomerStore.getState();
        const prev = store.applyOrder(o);
        if (prev === null) return; // not one of ours / already closed
        if (o.status === "cancelled") showToast(translate("orderCancelled", store.language));
        if (o.status === "paid" && useCustomerStore.getState().tableOrders.length === 0) {
          showToast(translate("thankYou", store.language));
          setView("menu");
        }
      },
      [EVENTS.TABLE_BILL_REQUESTED]: () => useCustomerStore.getState().setBillRequested(true),
      [EVENTS.TABLE_STATUS_UPDATED]: (p: { status: TableStatus }) => {
        const store = useCustomerStore.getState();
        if (p.status === "occupied" && store.activeOrder?.billRequested) showToast(translate("billReopened", store.language));
        if (p.status !== "bill_requested") store.setBillRequested(false);
      },
    },
    () => {
      if (tableNumber) void Promise.all([refreshMenu(), refreshOrders(tableNumber)]).catch(() => undefined);
    },
  );

  /* ---------------- menu filtering + scroll spy ---------------- */

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.filter((c) => c.items.length > 0);
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) =>
          [i.name_en, i.name_te, i.description_en ?? "", i.description_te ?? ""].some((s) => s.toLowerCase().includes(q)),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query]);

  const stickyHeight = () => stickyRef.current?.getBoundingClientRect().height ?? 0;

  useEffect(() => {
    // only once the menu is actually on screen — measuring the loader would mis-detect "scrolled to bottom"
    if (state !== "ready" || view !== "menu" || !visibleCategories.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < spyLockUntil.current) return;
      const offset = stickyHeight() + 24;
      let current = visibleCategories[0]!.id;
      for (const c of visibleCategories) {
        const el = sectionRefs.current.get(c.id);
        if (el && el.getBoundingClientRect().top <= offset) current = c.id;
      }
      // at the very bottom, the last short section can never reach the top
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = visibleCategories[visibleCategories.length - 1]!.id;
      }
      setActiveCat(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [state, view, visibleCategories]);

  const scrollToCategory = (id: number) => {
    const el = sectionRefs.current.get(id);
    if (!el) return;
    setActiveCat(id);
    spyLockUntil.current = Date.now() + 900;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - stickyHeight() - 8, behavior: "smooth" });
  };

  /* ---------------- actions ---------------- */

  const qtyInCart = (id: number) => cart.find((l) => l.id === String(id))?.quantity ?? 0;

  const handleAdd = (item: MenuItem) => {
    if (!item.is_available) return;
    if (item.is_combo) setComboItem(item);
    else useCustomerStore.getState().addToCart(item);
  };

  const placeOrder = async () => {
    const store = useCustomerStore.getState();
    if (!store.tableNumber || placing || store.cart.length === 0) return;
    setPlacing(true);
    setOrderError(null);
    const body: CreateOrderBody = {
      table_number: store.tableNumber,
      customer_notes: store.orderNotes.trim() || null,
      items: store.cart.map((l) => ({
        menu_item_id: l.menuItemId,
        quantity: l.quantity,
        item_notes: l.specialNotes.trim() || null,
        combo_selections: toComboSelections(l.selectedComboOptions),
      })),
    };
    try {
      const order = await viaSocketOrRest<Order>(EVENTS.ORDER_CREATE, body, () => api.placeOrder(body));
      store.applyOrder(order);
      store.clearCart();
      setCartOpen(false);
      setView("status");
      window.scrollTo({ top: 0 });
    } catch (e) {
      const gone = unavailableIds(e);
      if (gone.length) {
        store.removeMenuItems(gone);
        setOrderError(t("itemsWentOos"));
        void refreshMenu().catch(() => undefined);
      } else if (e instanceof CommandError && e.status === -1) {
        setOrderError(t("orderUncertain"));
        void refreshOrders(store.tableNumber).catch(() => undefined);
      } else {
        const status = e instanceof CommandError || e instanceof ApiError ? e.status : 500;
        setOrderError(status > 0 && status < 500 && e instanceof Error ? e.message : t("orderFailed"));
      }
    } finally {
      setPlacing(false);
    }
  };

  const requestBill = async () => {
    const store = useCustomerStore.getState();
    if (!store.tableNumber) return;
    setRequestingBill(true);
    try {
      const table_number = store.tableNumber;
      await viaSocketOrRest(EVENTS.TABLE_REQUEST_BILL, { table_number }, () => api.requestBill(table_number));
      store.setBillRequested(true);
    } catch {
      showToast(t("billFailed"));
    } finally {
      setRequestingBill(false);
    }
  };

  /* ---------------- render ---------------- */

  if (state === "loading") return <FullScreenLoader />;
  if (state === "invalid-table") return <ErrorView title={translate("invalidTable", "en")} message={translate("invalidTable", "te")} />;
  if (state === "error" || !tableNumber)
    return <ErrorView title={translate("loadError", "en")} message={translate("loadError", "te")} onRetry={load} />;

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background shadow-sm">
      <div ref={stickyRef} className="sticky top-0 z-30">
        <CustomerHeader
          tableNumber={tableNumber}
          view={view}
          onViewChange={(v) => {
            setView(v);
            window.scrollTo({ top: 0 });
          }}
          hasActiveOrder={Boolean(activeOrder)}
        />
        {view === "menu" && (
          <CategoryNav categories={visibleCategories} activeId={activeCat} onSelect={scrollToCategory} query={query} onQueryChange={setQuery} />
        )}
      </div>

      <ConnectionPill />

      {view === "menu" ? (
        <main className="space-y-7 px-4 pb-36 pt-4">
          <ActiveOrderBanner
            onTrack={() => {
              setView("status");
              window.scrollTo({ top: 0 });
            }}
          />
          {visibleCategories.length === 0 && <p className="py-16 text-center text-muted-foreground">{t("noResults")}</p>}
          {visibleCategories.map((c) => (
            <section
              key={c.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(c.id, el);
                else sectionRefs.current.delete(c.id);
              }}
              aria-labelledby={`cat-${c.id}`}
            >
              <h2 id={`cat-${c.id}`} className="mb-3 text-lg font-extrabold">
                {pick(c, "name", lang)}
                <span className="ml-2 text-sm font-medium text-muted-foreground">{c.items.length}</span>
              </h2>
              <div className="grid gap-3">
                {c.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    inCart={qtyInCart(item.id)}
                    onAdd={() => handleAdd(item)}
                    onDecrement={() => useCustomerStore.getState().decrementItem(String(item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
          <CartDrawer
            open={cartOpen}
            onOpenChange={(o) => {
              if (o) setOrderError(null);
              setCartOpen(o);
            }}
            placing={placing}
            error={orderError}
            onPlaceOrder={placeOrder}
          />
        </main>
      ) : (
        <OrderTracker
          requestingBill={requestingBill}
          onRequestBill={requestBill}
          onOrderMore={() => {
            setView("menu");
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {comboItem && (
        <ComboBuilderModal
          item={comboItem}
          onClose={() => setComboItem(null)}
          onAdd={(item, combo) => {
            useCustomerStore.getState().addToCart(item, combo);
            setComboItem(null);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 top-16 z-[60] mx-auto max-w-md animate-pop rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
