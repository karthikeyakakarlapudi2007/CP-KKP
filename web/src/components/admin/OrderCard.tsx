"use client";
import { BellRing, ChefHat, CircleCheck, HandPlatter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import { cn, formatINR, minutesSince, splitSnapshot } from "@/lib/utils";

type Action = "preparing" | "served" | "paid" | "cancelled";

export function OrderCard({ order, now, busy, onAction }: { order: Order; now: number; busy: boolean; onAction: (a: Action) => void }) {
  const mins = minutesSince(order.created_at, now);
  const late = mins > 15 && order.status !== "served";
  return (
    <div className={cn("rounded-xl border bg-card p-3 shadow-sm", order.bill_requested && "border-2 border-amber-400 bg-amber-50", late && "border-red-300")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-black leading-none">Table {order.table_number}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            #{order.id.slice(0, 6)} · <span className={cn(late && "font-bold text-destructive")}>{mins === 0 ? "just now" : `${mins} min ago`}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-extrabold">{formatINR(order.total_amount)}</span>
          {order.bill_requested && (
            <Badge variant="warning" className="animate-pulse">
              <BellRing className="size-3" /> Bill requested
            </Badge>
          )}
        </div>
      </div>

      <ul className="mt-2 space-y-1 border-t pt-2 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            <span className="font-bold">{i.quantity}×</span> {splitSnapshot(i.item_name_snapshot, "en")}
            {i.selected_combo_options?.length ? (
              <span className="block pl-5 text-xs text-muted-foreground">
                {i.selected_combo_options.map((s) => s.options.map((o) => o.name_en).join(", ")).join(" · ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {order.customer_notes && (
        <p className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">📝 {order.customer_notes}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "pending" && (
          <>
            <Button size="sm" className="flex-1" disabled={busy} onClick={() => onAction("preparing")}>
              <ChefHat /> Start Preparing
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm(`Cancel order for Table ${order.table_number}?`) && onAction("cancelled")} aria-label="Cancel order">
              <X />
            </Button>
          </>
        )}
        {order.status === "preparing" && (
          <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => onAction("served")}>
            <HandPlatter /> Mark Served
          </Button>
        )}
        {(order.status === "served" || order.bill_requested) && (
          <Button size="sm" variant="success" className="flex-1" disabled={busy} onClick={() => onAction("paid")}>
            <CircleCheck /> Mark as Paid
          </Button>
        )}
      </div>
    </div>
  );
}
