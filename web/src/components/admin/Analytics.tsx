"use client";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import type { AnalyticsSummary, Order } from "@/lib/types";
import { cn, formatINR, splitSnapshot } from "@/lib/utils";

type Range = "today" | "7d" | "30d";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];
/** Single-series bar hue (validated ≥3:1 on the card surface) */
const BAR = "#c0392b";

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Analytics() {
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: Range) => {
    try {
      const [summary, hist] = await Promise.all([api.analytics(r), api.orders("history", 50)]);
      setData(summary);
      setHistory(hist);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load analytics");
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const rangeLabel = RANGES.find((r) => r.id === range)!.label;
  const maxQty = Math.max(1, ...(data?.top_dishes.map((d) => d.quantity) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Analytics & History</h1>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={`Revenue · ${rangeLabel}`} value={formatINR(data.revenue)} hint="Paid orders only" />
            <StatTile label="Fulfilled orders" value={data.fulfilled_orders.toLocaleString("en-IN")} hint="Marked as paid" />
            <StatTile label="Average ticket size" value={formatINR(data.average_ticket)} />
            <StatTile label="Open orders now" value={data.open_orders.toLocaleString("en-IN")} hint="Pending, preparing or served" />
          </div>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-bold">Top-selling dishes</h2>
            <p className="mb-4 text-sm text-muted-foreground">Units sold · {rangeLabel.toLowerCase()} (excludes cancelled orders)</p>
            {data.top_dishes.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No sales yet in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 py-2 font-semibold">#</th>
                    <th className="py-2 font-semibold">Dish</th>
                    <th className="w-[40%] py-2 font-semibold">Units sold</th>
                    <th className="py-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_dishes.map((d, i) => (
                    <tr key={d.menu_item_id} className="border-b last:border-0 hover:bg-muted/50" title={`${splitSnapshot(d.name, "en")}: ${d.quantity} sold, ${formatINR(d.revenue)}`}>
                      <td className="py-2.5 font-bold tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5">
                        <span className="font-semibold">{splitSnapshot(d.name, "en")}</span>
                        <span className="block text-xs text-muted-foreground">{splitSnapshot(d.name, "te")}</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 rounded-r-[4px]"
                            style={{ width: `${(d.quantity / maxQty) * 85}%`, minWidth: 4, background: BAR }}
                            aria-hidden
                          />
                          <span className="font-semibold tabular-nums">{d.quantity}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{formatINR(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-bold">Order history (latest 50 closed tickets)</h2>
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
                    <td className="max-w-md truncate py-2">
                      {o.items.map((i) => `${i.quantity}× ${splitSnapshot(i.item_name_snapshot, "en")}`).join(", ")}
                    </td>
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
