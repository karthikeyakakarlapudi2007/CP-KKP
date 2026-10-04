"use client";
import { BellRing, Check, ChefHat, ClipboardCheck, HandPlatter, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ORDER_STATUS_LABEL, t } from "@/lib/i18n";
import type { Lang, Order, OrderStatus, TableStatus } from "@/lib/types";
import { cn, formatINR, splitSnapshot } from "@/lib/utils";
import { ComboSummary } from "./ComboSummary";

const STAGES: { status: OrderStatus; icon: typeof Check }[] = [
  { status: "pending", icon: ClipboardCheck },
  { status: "preparing", icon: ChefHat },
  { status: "served", icon: HandPlatter },
];

function Progress({ status, lang }: { status: OrderStatus; lang: Lang }) {
  const current = STAGES.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-start">
      {STAGES.map((s, i) => {
        const done = i <= current;
        const Icon = s.icon;
        return (
          <li key={s.status} className="relative flex flex-1 flex-col items-center gap-1 text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-5 h-1 w-full -translate-y-1/2", i <= current ? "bg-success" : "bg-muted")} />}
            <span
              className={cn(
                "relative z-10 flex size-10 items-center justify-center rounded-full border-2 bg-card transition",
                done ? "border-success bg-success text-white" : "border-muted text-muted-foreground",
                i === current && status !== "served" && "animate-pulse",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className={cn("text-[11px] font-semibold leading-tight", done ? "text-foreground" : "text-muted-foreground")}>
              {ORDER_STATUS_LABEL[s.status][lang]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type Props = {
  lang: Lang;
  orders: Order[];
  tableStatus: TableStatus;
  requestingBill: boolean;
  onRequestBill: () => void;
  onOrderMore: () => void;
};

export function OrderTracker({ lang, orders, tableStatus, requestingBill, onRequestBill, onOrderMore }: Props) {
  const due = orders.reduce((s, o) => s + o.total_amount, 0);
  const billRequested = tableStatus === "bill_requested";

  return (
    <div className="space-y-4 px-4 pb-40 pt-4">
      <h2 className="text-xl font-extrabold">{t("yourOrders", lang)}</h2>
      {orders.length === 0 && <p className="text-muted-foreground">{t("noOrdersYet", lang)}</p>}

      {[...orders].reverse().map((o) => (
        <section key={o.id} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>#{o.id.slice(0, 6).toUpperCase()}</span>
            <span>{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <Progress status={o.status} lang={lang} />
          <ul className="mt-4 divide-y border-t text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <div>
                  <span className="font-bold">{i.quantity}× </span>
                  {splitSnapshot(i.item_name_snapshot, lang)}
                  <ComboSummary steps={i.selected_combo_options} lang={lang} />
                </div>
                <span className="shrink-0 font-semibold">{formatINR(i.unit_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          {o.customer_notes && (
            <p className="mt-2 rounded-lg bg-accent/30 px-3 py-2 text-xs">
              <span className="font-bold">{t("notes", lang)}:</span> {o.customer_notes}
            </p>
          )}
          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
            <span>{t("total", lang)}</span>
            <span>{formatINR(o.total_amount)}</span>
          </div>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg space-y-2 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {orders.length > 0 && (
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-muted-foreground">{t("amountDue", lang)}</span>
            <span className="text-lg font-extrabold">{formatINR(due)}</span>
          </div>
        )}
        {billRequested ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
            <BellRing className="size-5 shrink-0 animate-bounce" />
            <span>
              {t("billRequested", lang)}
              <span className="block text-xs font-normal">{t("payAtTable", lang)}</span>
            </span>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onOrderMore}>
            <Plus /> {t("orderMore", lang)}
          </Button>
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            disabled={orders.length === 0 || billRequested || requestingBill}
            onClick={onRequestBill}
          >
            {requestingBill ? <Spinner className="size-4" /> : <Receipt />} {t("requestBill", lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
