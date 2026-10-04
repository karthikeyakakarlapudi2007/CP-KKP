"use client";
import { BellRing, Check, ChefHat, ClipboardCheck, HandPlatter, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/translations";
import type { Order } from "@/lib/types";
import { computeBill, GST_RATE, ordersSubtotal } from "@/lib/billing";
import { cn, formatINR, splitSnapshot } from "@/lib/utils";
import { useCustomerStore, type ActiveOrderStatus } from "@/store/useCustomerStore";
import { ComboSummary } from "./ComboSummary";

const STAGES: { status: ActiveOrderStatus; label: TranslationKey; icon: typeof Check }[] = [
  { status: "pending", label: "statusPending", icon: ClipboardCheck },
  { status: "preparing", label: "statusPreparing", icon: ChefHat },
  { status: "served", label: "statusServed", icon: HandPlatter },
];

/** Live 3-stage indicator: Order Received → Preparing in Kitchen → Served to Table. */
function StatusSteps({ status, compact }: { status: Order["status"]; compact?: boolean }) {
  const { t } = useTranslation();
  const current = STAGES.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-start" aria-label={t(STAGES[Math.max(0, current)]!.label)}>
      {STAGES.map((s, i) => {
        const done = i < current || (i === current && status === "served");
        const active = i === current && status !== "served";
        const Icon = s.icon;
        return (
          <li key={s.status} className="relative flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={i === current ? "step" : undefined}>
            {i > 0 && (
              <span className="absolute right-1/2 top-5 h-1 w-full -translate-y-1/2 overflow-hidden rounded bg-muted" aria-hidden>
                <span className={cn("block h-full bg-success transition-all duration-700", i <= current ? "w-full" : "w-0")} />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full border-2 bg-card transition-all duration-500",
                compact ? "size-8" : "size-10",
                done && "border-success bg-success text-white",
                active && "scale-110 border-primary bg-primary text-white shadow-lg shadow-primary/30",
                !done && !active && "border-muted text-muted-foreground",
              )}
            >
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" aria-hidden />}
              {done ? <Check className="size-4" strokeWidth={3} /> : <Icon className={compact ? "size-4" : "size-5"} />}
            </span>
            <span className={cn("px-1 text-[11px] font-semibold leading-tight", i <= current ? "text-foreground" : "text-muted-foreground")}>
              {t(s.label)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type Props = {
  requestingBill: boolean;
  onRequestBill: () => void;
  onOrderMore: () => void;
};

export function OrderTracker({ requestingBill, onRequestBill, onOrderMore }: Props) {
  const { t, lang } = useTranslation();
  const activeOrder = useCustomerStore((s) => s.activeOrder);
  const orders = useCustomerStore((s) => s.tableOrders);
  const billRequested = Boolean(activeOrder?.billRequested);
  const bill = computeBill(ordersSubtotal(orders));
  const latestFirst = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-4 px-4 pb-48 pt-4">
      {billRequested && (
        <div role="alert" className="flex animate-pop items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm">
          <BellRing className="mt-0.5 size-6 shrink-0 animate-bounce" />
          <div>
            <p className="font-bold leading-snug">{t("billBanner")}</p>
            <p className="mt-0.5 text-xs">{t("payAtTable")}</p>
          </div>
        </div>
      )}

      {activeOrder ? (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{t("yourOrder")}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">#{activeOrder.id.slice(0, 6).toUpperCase()}</span>
          </div>
          <StatusSteps status={activeOrder.status} />
        </section>
      ) : (
        <p className="py-10 text-center text-muted-foreground">{t("noOpenOrders")}</p>
      )}

      {latestFirst.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-1 font-bold">{t("orderSummary")}</h3>
          {latestFirst.map((o, idx) => (
            <div key={o.id} className={cn("py-3", idx > 0 && "border-t")}>
              {latestFirst.length > 1 && (
                <div className="mb-3">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 font-bold", o.round > 1 ? "bg-violet-100 text-violet-800" : "bg-muted text-foreground")}>
                        {t("round")} {o.round}
                        {o.round > 1 && ` · ${t("addOn")}`}
                      </span>
                      <span className="font-mono">#{o.id.slice(0, 6).toUpperCase()}</span>
                    </span>
                    <span>{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {o.id !== activeOrder?.id && <StatusSteps status={o.status} compact />}
                </div>
              )}
              <ul className="space-y-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold">{i.quantity}× </span>
                      {splitSnapshot(i.item_name_snapshot, lang)}
                      <ComboSummary steps={i.selected_combo_options} lang={lang} />
                      {i.item_notes && <p className="text-xs italic text-muted-foreground">“{i.item_notes}”</p>}
                    </div>
                    <span className="shrink-0 font-semibold">{formatINR(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {o.customer_notes && (
                <p className="mt-2 rounded-lg bg-accent/30 px-3 py-2 text-xs">
                  <span className="font-bold">{t("cookingInstructions")}:</span> {o.customer_notes}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg space-y-2 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {orders.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              {t("amountDue")}
              {GST_RATE > 0 && <span className="block text-[11px]">{formatINR(bill.subtotal)} + {GST_RATE}% GST</span>}
            </span>
            <span className="text-xl font-black">{formatINR(bill.netPayable)}</span>
          </div>
        )}
        <Button
          size="lg"
          variant={billRequested ? "secondary" : "accent"}
          className="w-full text-base"
          disabled={orders.length === 0 || billRequested || requestingBill}
          onClick={onRequestBill}
        >
          {requestingBill ? <Spinner className="size-4" /> : billRequested ? <Check /> : <Receipt />}
          {billRequested ? t("billRequestedBtn") : t("requestBill")}
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={onOrderMore}>
          <Plus /> {t("orderMore")}
        </Button>
      </div>
    </div>
  );
}
