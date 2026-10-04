"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/events";
import { errorMessage } from "@/lib/staffActions";
import type { AnalyticsSummary, Order } from "@/lib/types";
import { cn, formatINR, splitSnapshot } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";

type Range = "today" | "7d" | "30d";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];
const TOP_N = 5;
/** Single-series bar hue (validated ≥ 3:1 against the card surface) */
const BAR = "#c0392b";

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AnalyticsTab() {
  const staffKey = useStaffStore((s) => s.key);
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const rangeRef = useRef(range);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  rangeRef.current = range;

  const load = useCallback(async () => {
    try {
      const [summary, hist] = await Promise.all([api.analytics(rangeRef.current, TOP_N), api.orders("history", 50)]);
      setData(summary);
      setHistory(hist);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load analytics"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, range]);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** Revenue moves when a ticket is paid; top sellers move as orders come in. */
  const reloadSoon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 400);
  }, [load]);

  useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.ORDER_CREATED]: reloadSoon,
      [EVENTS.ORDER_STATUS_CHANGED]: (o: Order) => {
        if (o.status === "paid" || o.status === "cancelled") reloadSoon();
      },
    },
    load,
  );

  const rangeLabel = RANGES.find((r) => r.id === range)!.label;
  const maxQty = Math.max(1, ...(data?.top_dishes.map((d) => d.quantity) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Sales & Business Analytics</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <RefreshCw className="size-3" /> Updates live as tables pay
            {updatedAt && <> · last refreshed {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>}
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-1" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", range === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="font-semibold text-destructive">{error}</p>}
      {!data ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="size-10" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label={range === "today" ? "Today's revenue" : `Revenue · ${rangeLabel.toLowerCase()}`} value={formatINR(data.revenue)} hint="Sum of paid orders" />
            <StatTile label="Fulfilled orders" value={data.fulfilled_orders.toLocaleString("en-IN")} hint="Orders marked as paid" />
            <StatTile label="Average ticket size" value={formatINR(data.average_ticket)} hint="Revenue ÷ fulfilled orders" />
          </div>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-bold">Top {TOP_N} selling dishes</h2>
            <p className="mb-4 text-sm text-muted-foreground">By quantity sold · {rangeLabel.toLowerCase()} (cancelled orders excluded)</p>
            {data.top_dishes.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No sales yet in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 py-2 font-semibold">#</th>
                    <th className="py-2 font-semibold">Dish</th>
                    <th className="w-[42%] py-2 font-semibold">Quantity sold</th>
                    <th className="py-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_dishes.map((d, i) => (
                    <tr
                      key={d.menu_item_id}
                      className="border-b last:border-0 hover:bg-muted/50"
                      title={`${splitSnapshot(d.name, "en")}: ${d.quantity} sold · ${formatINR(d.revenue)}`}
                    >
                      <td className="py-3 font-bold tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="py-3">
                        <span className="font-semibold">{splitSnapshot(d.name, "en")}</span>
                        <span className="block text-xs text-muted-foreground" lang="te">{splitSnapshot(d.name, "te")}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 rounded-r-[4px] transition-[width] duration-500"
                            style={{ width: `${(d.quantity / maxQty) * 85}%`, minWidth: 4, background: BAR }}
                            aria-hidden
                          />
                          <span className="font-semibold tabular-nums">{d.quantity}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums">{formatINR(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-bold">Order history · latest 50 closed tickets</h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">No closed orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 font-semibold">Time</th>
                  <th className="py-2 font-semibold">Table</th>
                  <th className="py-2 font-semibold">Items</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 font-bold">T{o.table_number}</td>
                    <td className="max-w-md truncate py-2">{o.items.map((i) => `${i.quantity}× ${splitSnapshot(i.item_name_snapshot, "en")}`).join(", ")}</td>
                    <td className="py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", o.status === "paid" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                        {o.status === "paid" ? "✓ Paid" : "✕ Cancelled"}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{formatINR(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
