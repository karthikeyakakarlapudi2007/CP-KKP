"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BellRing, Clock, Users, Wifi, WifiOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/useNow";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { errorMessage, updateOrderStatus, type StaffStatus } from "@/lib/staffActions";
import type { Order, OrderStatus, TableStatus, TableSummary } from "@/lib/types";
import { cn, formatINR, minutesSince } from "@/lib/utils";
import { useAdminStore } from "@/store/useAdminStore";
import { useStaffStore } from "@/store/useStaffStore";
import { OrderCard } from "./OrderCard";
import { TableDetailsDrawer } from "./TableDetailsDrawer";

const ACTIVE = new Set<OrderStatus>(["pending", "preparing", "served"]);
const COLUMNS: { status: OrderStatus; title: string; dot: string }[] = [
  { status: "pending", title: "New", dot: "bg-rose-500" },
  { status: "preparing", title: "In the kitchen", dot: "bg-sky-500" },
  { status: "served", title: "Served · awaiting payment", dot: "bg-emerald-500" },
];
const STATUS_LABEL: Record<TableStatus, string> = { vacant: "Vacant", occupied: "Occupied", bill_requested: "Bill requested" };

export function LiveOrdersTab() {
  const staffKey = useStaffStore((s) => s.key);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openTableId = Number(params.get("table")) || null;

  const [tables, setTables] = useState<TableSummary[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const now = useNow(15_000);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadTables = useCallback(async () => setTables(await api.tables()), []);
  const refreshTablesSoon = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void loadTables().catch(() => undefined), 200);
  }, [loadTables]);

  const load = useCallback(async () => {
    try {
      const [o] = await Promise.all([api.orders("active"), loadTables()]);
      setOrders(o);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load live orders"));
    } finally {
      setLoading(false);
    }
  }, [loadTables]);

  useEffect(() => {
    void load();
    return () => clearTimeout(refreshTimer.current);
  }, [load]);

  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const rest = prev.filter((p) => p.id !== o.id);
      return ACTIVE.has(o.status) ? [...rest, o] : rest;
    });
  }, []);

  const { connected } = useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.ORDER_CREATED]: (o: Order) => {
        upsert(o);
        refreshTablesSoon();
      },
      [EVENTS.ORDER_STATUS_CHANGED]: (o: Order) => {
        upsert(o);
        refreshTablesSoon();
      },
      [EVENTS.TABLE_BILL_REQUESTED]: (p: { table_number: number; order_ids: string[] }) => {
        setOrders((prev) => prev.map((o) => (p.order_ids.includes(o.id) ? { ...o, bill_requested: true } : o)));
        setTables((prev) => prev.map((t) => (t.id === p.table_number ? { ...t, status: "bill_requested" } : t)));
        refreshTablesSoon();
      },
      [EVENTS.TABLE_STATUS_UPDATED]: (p: { id: number; status: TableStatus }) => {
        setTables((prev) => prev.map((t) => (t.id === p.id ? { ...t, status: p.status } : t)));
        refreshTablesSoon();
      },
    },
    load,
  );

  const ordersByTable = useMemo(() => {
    const map = new Map<number, Order[]>();
    for (const o of [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      map.set(o.table_number, [...(map.get(o.table_number) ?? []), o]);
    }
    return map;
  }, [orders]);

  const byStatus = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map((c) => [c.status, orders.filter((o) => o.status === c.status).sort((a, b) => a.created_at.localeCompare(b.created_at))]),
      ) as Record<OrderStatus, Order[]>,
    [orders],
  );

  const setOpenTable = (id: number | null) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "orders");
    if (id) next.set("table", String(id));
    else next.delete("table");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const act = async (order: Order, status: StaffStatus) => {
    setBusy(order.id);
    try {
      upsert(await updateOrderStatus(order.id, status));
      refreshTablesSoon();
    } catch (e) {
      setError(errorMessage(e, "Update failed"));
      void load();
    } finally {
      setBusy(null);
    }
  };

  const settle = async (table: TableSummary) => {
    setSettling(true);
    try {
      const res = await api.settleTable(table.id);
      setOrders((prev) => prev.filter((o) => !res.settled_order_ids.includes(o.id)));
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: "vacant", amount_due: 0, active_orders: 0 } : t)));
      useAdminStore.getState().clearBillAlert(table.id);
      setOpenTable(null);
    } catch (e) {
      setError(errorMessage(e, "Could not settle the table"));
    } finally {
      setSettling(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>;

  const openTable = tables.find((t) => t.id === openTableId) ?? null;
  const occupied = tables.filter((t) => t.status !== "vacant").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Live Orders & Tables</h1>
          <p className="text-sm text-muted-foreground">
            {occupied} of {tables.length} tables occupied · {orders.length} open ticket{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", connected ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
          {connected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />} {connected ? "Live" : "Reconnecting"}
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          {error}
          <button onClick={() => setError(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Table grid */}
      <section aria-label="Tables" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tables.map((t) => {
          const tOrders = ordersByTable.get(t.id) ?? [];
          const since = tOrders[0] ? minutesSince(tOrders[0].created_at, now) : null;
          const bill = t.status === "bill_requested";
          return (
            <button
              key={t.id}
              onClick={() => setOpenTable(t.id)}
              aria-label={`Table ${t.id}, ${STATUS_LABEL[t.status]}`}
              className={cn(
                "relative flex min-h-32 flex-col rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                t.status === "vacant" && "border-dashed bg-card text-muted-foreground",
                t.status === "occupied" && "border-sky-300 bg-sky-50 text-sky-950",
                bill && "animate-bell-flash border-amber-500 text-amber-950",
              )}
            >
              {bill && (
                <span className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 rounded-t-xl bg-amber-950 py-1 text-[11px] font-black tracking-wider text-amber-200">
                  <BellRing className="size-3" /> TABLE {t.id} REQUESTED BILL
                </span>
              )}
              <div className={cn("flex items-start justify-between", bill && "mt-5")}>
                <span className="text-3xl font-black leading-none">T{t.id}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", t.status === "vacant" ? "bg-muted" : bill ? "bg-amber-950 text-amber-100" : "bg-sky-200")}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              {t.status !== "vacant" || t.amount_due > 0 ? (
                <div className="mt-auto pt-3">
                  <p className="text-xl font-extrabold tabular-nums">{formatINR(t.amount_due)}</p>
                  <p className="flex items-center gap-3 text-xs opacity-80">
                    <span className="flex items-center gap-1"><Users className="size-3" /> {t.active_orders} ticket{t.active_orders === 1 ? "" : "s"}</span>
                    {since !== null && <span className="flex items-center gap-1"><Clock className="size-3" /> {since}m</span>}
                  </p>
                </div>
              ) : (
                <p className="mt-auto pt-3 text-xs">Ready for guests</p>
              )}
            </button>
          );
        })}
      </section>

      {/* Ticket pipeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <section key={col.status} className="flex min-h-48 flex-col rounded-2xl bg-muted/60 p-3">
            <h2 className="mb-3 flex items-center gap-2 px-1 font-bold">
              <span className={cn("size-2.5 rounded-full", col.dot)} />
              {col.title}
              <span className="ml-auto rounded-full bg-card px-2 text-sm">{byStatus[col.status].length}</span>
            </h2>
            <div className="space-y-3">
              {byStatus[col.status].length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here</p>}
              {byStatus[col.status].map((o) => (
                <OrderCard key={o.id} order={o} now={now} busy={busy === o.id} onAction={(a) => void act(o, a)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <TableDetailsDrawer
        table={openTable}
        orders={openTable ? ordersByTable.get(openTable.id) ?? [] : []}
        settling={settling}
        onClose={() => setOpenTable(null)}
        onSettle={(t) => void settle(t)}
      />
    </div>
  );
}
