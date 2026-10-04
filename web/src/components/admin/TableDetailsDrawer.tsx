"use client";
import { useEffect, useState } from "react";
import { Banknote, CircleCheck, Clock, Printer, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { computeBill, GST_RATE, ordersSubtotal } from "@/lib/billing";
import type { Order, TableSummary } from "@/lib/types";
import { cn, formatINR, minutesSince, splitSnapshot } from "@/lib/utils";

const STATUS_BADGE: Record<string, { label: string; variant: "muted" | "default" | "success" }> = {
  pending: { label: "Waiting for kitchen", variant: "muted" },
  preparing: { label: "Preparing", variant: "default" },
  served: { label: "Served", variant: "success" },
};

type Props = {
  table: TableSummary | null;
  orders: Order[];
  settling: boolean;
  onClose: () => void;
  onSettle: (table: TableSummary) => void;
  onGenerateBill: (table: TableSummary) => void;
};

/** Running ticket for one table + "Mark as Paid / Cash Collected". */
export function TableDetailsDrawer({ table, orders, settling, onClose, onSettle, onGenerateBill }: Props) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [table?.id]);

  if (!table) return null;
  const bill = computeBill(ordersSubtotal(orders));
  const total = bill.netPayable;
  const unserved = orders.filter((o) => o.status !== "served").length;
  const billRequested = table.status === "bill_requested";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent side="right" aria-describedby="table-drawer-desc">
        <div className={cn("border-b px-6 pb-4 pt-6", billRequested && "bg-amber-100")}>
          <DialogTitle className="text-2xl font-black">Table {table.id}</DialogTitle>
          <DialogDescription id="table-drawer-desc" className="mt-1 flex items-center gap-2">
            {billRequested ? (
              <Badge variant="warning"><Receipt className="size-3" /> Bill requested</Badge>
            ) : (
              <Badge variant={table.status === "vacant" ? "muted" : "default"}>{table.status === "vacant" ? "Vacant" : "Occupied"}</Badge>
            )}
            <span>{orders.length} running order{orders.length === 1 ? "" : "s"}</span>
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {orders.length === 0 && <p className="py-16 text-center text-muted-foreground">No running ticket on this table.</p>}
          {orders.map((o) => {
            const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.pending!;
            return (
              <section key={o.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", o.round > 1 ? "bg-violet-100 text-violet-800" : "bg-muted text-foreground")}>
                      Round {o.round}{o.round > 1 ? " · add-on" : ""}
                    </span>
                    <span className="font-mono">#{o.id.slice(0, 6).toUpperCase()}</span>
                  </span>
                  <span className="flex items-center gap-1"><Clock className="size-3" /> {minutesSince(o.created_at)} min ago</span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <ul className="divide-y text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p><span className="font-bold">{i.quantity}×</span> {splitSnapshot(i.item_name_snapshot, "en")}</p>
                        {i.selected_combo_options?.map((s) => (
                          <p key={s.step_number} className="pl-5 text-xs text-muted-foreground">
                            ↳ {s.step_title_en}: {s.options.map((op) => op.name_en).join(", ")}
                          </p>
                        ))}
                        {i.item_notes && <p className="pl-5 text-xs italic text-muted-foreground">“{i.item_notes}”</p>}
                      </div>
                      <span className="shrink-0 tabular-nums">{formatINR(i.unit_price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {o.customer_notes && <p className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">📝 {o.customer_notes}</p>}
                <div className="mt-2 flex justify-between border-t pt-2 text-sm font-bold">
                  <span>Round subtotal</span>
                  <span className="tabular-nums">{formatINR(o.total_amount)}</span>
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-3 border-t bg-card p-6">
          {orders.length > 0 && GST_RATE > 0 && (
            <dl className="space-y-0.5 text-sm text-muted-foreground">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(bill.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>CGST {bill.halfRate}% + SGST {bill.halfRate}%</dt><dd className="tabular-nums">{formatINR(bill.cgst + bill.sgst)}</dd></div>
              <div className="flex justify-between"><dt>Round off</dt><dd className="tabular-nums">{bill.roundOff >= 0 ? "+" : "−"}{formatINR(Math.abs(bill.roundOff))}</dd></div>
            </dl>
          )}
          <div className="flex items-end justify-between">
            <span className="font-semibold text-muted-foreground">Net payable</span>
            <span className="text-4xl font-black tabular-nums">{formatINR(total)}</span>
          </div>
          <Button variant="outline" size="lg" className="w-full" disabled={orders.length === 0} onClick={() => onGenerateBill(table)}>
            <Printer /> Generate Bill / <span lang="te">బిల్ ప్రింట్</span>
          </Button>
          {unserved > 0 && orders.length > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {unserved} order{unserved === 1 ? " is" : "s are"} still with the kitchen — settling closes {unserved === 1 ? "it" : "them"} too.
            </p>
          )}
          {confirming ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => setConfirming(false)} disabled={settling}>Back</Button>
              <Button variant="success" size="lg" onClick={() => onSettle(table)} disabled={settling}>
                {settling ? <Spinner className="size-4 text-white" /> : <CircleCheck />} Confirm {formatINR(total)}
              </Button>
            </div>
          ) : (
            <Button variant="success" size="lg" className="w-full text-base" disabled={orders.length === 0} onClick={() => setConfirming(true)}>
              <Banknote /> Mark as Paid / Cash Collected
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
