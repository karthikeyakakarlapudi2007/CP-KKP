"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { amountPayable } from "@/lib/billing";
import { formatINR, splitSnapshot } from "@/lib/utils";
import { useCustomerStore } from "@/store/useCustomerStore";

/**
 * Shown on the menu whenever this table already has open tickets — for the second guest who
 * scans the QR, or anyone ordering Round 2. The menu stays fully usable underneath.
 */
export function ActiveOrderBanner({ onTrack }: { onTrack: () => void }) {
  const { t, lang } = useTranslation();
  const orders = useCustomerStore((s) => s.tableOrders);
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const o of orders)
      for (const i of o.items) {
        const name = splitSnapshot(i.item_name_snapshot, lang);
        map.set(name, { name, qty: (map.get(name)?.qty ?? 0) + i.quantity });
      }
    return [...map.values()];
  }, [orders, lang]);

  if (orders.length === 0) return null;
  const rounds = Math.max(...orders.map((o) => o.round ?? 1));
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  return (
    <section aria-label={t("activeOrderTitle")} className="animate-pop overflow-hidden rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 text-emerald-950 shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <span className="relative mt-1 flex size-3 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-snug">{t("activeOrderTitle")}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs font-medium text-emerald-900/80">
            <span className="flex items-center gap-1"><Users className="size-3" /> {t("round")} {rounds}</span>
            <span>{itemCount} {itemCount === 1 ? t("item") : t("items")}</span>
          </p>
          <p className="mt-1.5 text-xs leading-snug text-emerald-900/80">{t("activeOrderHint")}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">{t("runningBill")}</p>
          <p className="text-xl font-black tabular-nums">{formatINR(amountPayable(orders))}</p>
          <p className="text-[10px] text-emerald-900/70">{t("inclGst")}</p>
        </div>
      </div>

      {open && (
        <ul className="mx-4 mb-3 space-y-1 rounded-xl bg-white/70 p-3 text-sm">
          <li className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-900/70">{t("alreadyOrdered")}</li>
          {items.map((i) => (
            <li key={i.name} className="flex justify-between gap-2">
              <span className="truncate">{i.name}</span>
              <span className="shrink-0 font-bold">×{i.qty}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 border-t border-emerald-500/30 text-sm font-bold">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center justify-center gap-1 py-2.5 hover:bg-emerald-100">
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /> {open ? t("hideItems") : t("showItems")}
        </button>
        <button onClick={onTrack} className="flex items-center justify-center gap-1 border-l border-emerald-500/30 py-2.5 hover:bg-emerald-100">
          <ClipboardList className="size-4" /> {t("trackOrder")}
        </button>
      </div>
    </section>
  );
}
