"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CircleCheck, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/useNow";
import { useSocket } from "@/hooks/useSocket";
import { api, ApiError } from "@/lib/api";
import { playAlert, playChime, unlockAudio } from "@/lib/chime";
import { EVENTS } from "@/lib/events";
import type { Order, OrderStatus, TableSummary } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { OrderCard } from "./OrderCard";
import { TableFloor } from "./TableFloor";

const COLUMNS: { status: OrderStatus; title: string; tint: string }[] = [
  { status: "pending", title: "New Orders", tint: "bg-rose-500" },
  { status: "preparing", title: "Preparing", tint: "bg-sky-500" },
  { status: "served", title: "Served · Awaiting Payment", tint: "bg-emerald-500" },
];
const ACTIVE = new Set<OrderStatus>(["pending", "preparing", "served"]);

export function OrdersCenter() {
  const staffKey = useStaffStore((s) => s.key);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [settle, setSettle] = useState<TableSummary | null>(null);
  const now = useNow(15_000);
  const tablesTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadTables = useCallback(() => api.tables().then(setTables), []);
  /** Coalesce bursts of events into one floor refresh */
  const refreshTablesSoon = useCallback(() => {
    clearTimeout(tablesTimer.current);
    tablesTimer.current = setTimeout(() => void loadTables().catch(() => undefined), 250);
  }, [loadTables]);

  const load = useCallback(async () => {
    try {
      const [o] = await Promise.all([api.orders("active"), loadTables()]);
      setOrders(o);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [loadTables]);

  useEffect(() => {
    void load();
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
        if (soundOn) void playChime();
      },
      [EVENTS.ORDER_STATUS_CHANGED]: (o: Order) => {
        upsert(o);
        refreshTablesSoon();
      },
      [EVENTS.TABLE_UPDATED]: refreshTablesSoon,
      [EVENTS.TABLE_BILL_REQUESTED]: (p: { table_number: number; order_ids: string[] }) => {
        setOrders((prev) => prev.map((o) => (p.order_ids.includes(o.id) ? { ...o, bill_requested: true } : o)));
        refreshTablesSoon();
        if (soundOn) void playAlert();
      },
    },
    load,
  );

  const act = async (order: Order, status: "preparing" | "served" | "paid" | "cancelled") => {
    setBusy(order.id);
    try {
      upsert(await api.setOrderStatus(order.id, status));
      refreshTablesSoon();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
      void load();
    } finally {
      setBusy(null);
    }
  };

  const settleTable = async () => {
    if (!settle) return;
    setBusy(`table-${settle.id}`);
    try {
      const res = await api.settleTable(settle.id);
      setOrders((prev) => prev.filter((o) => !res.settled_order_ids.includes(o.id)));
      setSettle(null);
      void loadTables();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not settle table");
    } finally {
      setBusy(null);
    }
  };

  const billTables = useMemo(() => tables.filter((t) => t.status === "bill_requested"), [tables]);
  const byStatus = useMemo(() => {
    const sorted = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Object.fromEntries(COLUMNS.map((c) => [c.status, sorted.filter((o) => o.status === c.status)])) as Record<OrderStatus, Order[]>;
  }, [orders]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Order Control Center</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 font-semibold", connected ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {connected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />} {connected ? "Live" : "Reconnecting"}
          </span>
          <Button
            size="sm"
            variant={soundOn ? "outline" : "accent"}
            onClick={async () => {
              if (!soundOn) await unlockAudio();
              setSoundOn((s) => !s);
            }}
          >
            {soundOn ? <Volume2 /> : <VolumeX />} {soundOn ? "Alerts on" : "Enable sound alerts"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
          {error}
          <button onClick={() => setError(null)} className="underline">Dismiss</button>
        </div>
      )}

      {billTables.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-3 text-amber-950">
          <BellRing className="size-6 animate-bounce" />
          <span className="font-bold">Bill requested:</span>
          {billTables.map((t) => (
            <button key={t.id} onClick={() => setSettle(t)} className="rounded-lg bg-amber-400 px-3 py-1 font-black hover:bg-amber-500">
              Table {t.id} · {formatINR(t.amount_due)}
            </button>
          ))}
        </div>
      )}

      <TableFloor tables={tables} onSettle={setSettle} />

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <section key={col.status} className="flex min-h-64 flex-col rounded-2xl bg-muted/60 p-3">
            <h2 className="mb-3 flex items-center gap-2 px-1 font-bold">
              <span className={cn("size-2.5 rounded-full", col.tint)} />
              {col.title}
              <span className="ml-auto rounded-full bg-card px-2 text-sm">{byStatus[col.status].length}</span>
            </h2>
            <div className="space-y-3">
              {byStatus[col.status].length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No orders</p>}
              {byStatus[col.status].map((o) => (
                <OrderCard key={o.id} order={o} now={now} busy={busy === o.id} onAction={(a) => void act(o, a)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!settle} onOpenChange={(o) => !o && setSettle(null)}>
        <DialogContent className="p-6">
          <DialogTitle>Settle Table {settle?.id}?</DialogTitle>
          <DialogDescription className="mt-1">
            Marks all {settle?.active_orders} open order(s) as paid, archives them and resets the table to vacant.
          </DialogDescription>
          <p className="my-5 text-center text-4xl font-black">{formatINR(settle?.amount_due ?? 0)}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSettle(null)}>Cancel</Button>
            <Button variant="success" className="flex-1" disabled={busy === `table-${settle?.id}`} onClick={settleTable}>
              <CircleCheck /> Mark as Paid
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
