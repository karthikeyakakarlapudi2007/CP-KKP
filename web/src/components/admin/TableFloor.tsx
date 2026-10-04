"use client";
import { BellRing } from "lucide-react";
import type { TableSummary } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

const STYLE = {
  vacant: "border-dashed bg-card text-muted-foreground",
  occupied: "border-sky-300 bg-sky-50 text-sky-900",
  bill_requested: "border-2 border-amber-400 bg-amber-300 text-amber-950 shadow-lg shadow-amber-200 animate-pulse",
} as const;

export function TableFloor({ tables, onSettle }: { tables: TableSummary[]; onSettle: (t: TableSummary) => void }) {
  return (
    <section aria-label="Tables">
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-bold uppercase tracking-wider text-foreground">Floor</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded border border-dashed" /> Vacant</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-sky-200" /> Occupied</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-amber-300" /> Bill requested</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => t.active_orders > 0 && onSettle(t)}
            disabled={t.active_orders === 0}
            title={t.active_orders ? `Settle Table ${t.id}` : `Table ${t.id} is vacant`}
            className={cn("flex h-16 flex-col items-center justify-center rounded-xl border text-center transition", STYLE[t.status])}
          >
            <span className="flex items-center gap-1 text-lg font-black leading-none">
              {t.status === "bill_requested" && <BellRing className="size-4" />}T{t.id}
            </span>
            {t.amount_due > 0 && <span className="text-[11px] font-semibold">{formatINR(t.amount_due)}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
