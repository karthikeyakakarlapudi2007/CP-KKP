"use client";
import { memo } from "react";
import { ChefHat, Clock, HandPlatter, Loader2, PlusCircle } from "lucide-react";
import type { Order } from "@/lib/types";
import { cn, splitSnapshot } from "@/lib/utils";

type Props = {
  order: Order;
  now: number;
  isNew: boolean;
  busy: boolean;
  onAdvance: (order: Order, next: "preparing" | "served") => void;
};

/** "Select Base" → "Base", "Choose Curry" → "Curry" for tight kitchen tickets */
const shortStep = (title: string) => title.replace(/^(select|choose|pick)\s+/i, "").replace(/\s*\(.*\)\s*$/, "");

export function elapsedLabel(createdAt: string, now: number) {
  const secs = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  if (secs < 60) return "just now";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export function urgencyOf(createdAt: string, now: number): "ok" | "warn" | "late" {
  const mins = (now - new Date(createdAt).getTime()) / 60_000;
  return mins >= 15 ? "late" : mins >= 8 ? "warn" : "ok";
}

export const KdsTicket = memo(function KdsTicket({ order, now, isNew, busy, onAdvance }: Props) {
  const urgency = urgencyOf(order.created_at, now);
  const preparing = order.status === "preparing";
  const isAddon = (order.round ?? 1) > 1;

  return (
    <article
      aria-label={`Table ${order.table_number}`}
      data-round={order.round}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border-2 bg-slate-900 shadow-xl transition-[border-color,box-shadow] duration-500",
        urgency === "ok" && "border-slate-700",
        urgency === "warn" && "border-orange-500",
        urgency === "late" && "border-red-500 shadow-red-950",
        isAddon && urgency === "ok" && "border-violet-500",
        isNew && !isAddon && "animate-[kds-glow_1.25s_ease-in-out_infinite] border-sky-400",
        isNew && isAddon && "animate-[kds-glow-addon_1.25s_ease-in-out_infinite] border-violet-400",
      )}
    >
      {isAddon && (
        <div className="flex items-center justify-center gap-2 bg-violet-600 py-1.5 text-sm font-black uppercase tracking-widest text-white">
          <PlusCircle className="size-4" /> TABLE #{order.table_number} (ADD-ON / ROUND {order.round})
        </div>
      )}
      {/* Header: giant table badge + live timer */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-4 py-3">
        <span className="flex items-baseline gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 py-1 font-black text-slate-950">
          <span className="text-base tracking-wider">TABLE</span>
          <span className="text-4xl leading-none tracking-tight">#{order.table_number}</span>
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-lg font-black tabular-nums",
            urgency === "ok" && "bg-slate-800 text-slate-200",
            urgency === "warn" && "bg-orange-500 text-slate-950",
            urgency === "late" && "animate-[kds-flash_0.9s_ease-in-out_infinite] bg-red-600 text-white",
          )}
        >
          <Clock className="size-5" />
          {elapsedLabel(order.created_at, now)}
        </span>
      </header>

      <div className="flex items-center justify-between px-4 pt-2 text-xs font-bold uppercase tracking-widest">
        <span className="text-slate-500">#{order.id.slice(0, 6)}</span>
        {isNew && <span className={cn("rounded px-1.5", isAddon ? "bg-violet-400 text-slate-950" : "bg-sky-500 text-slate-950")}>{isAddon ? "New add-on" : "New"}</span>}
        <span className={preparing ? "text-sky-400" : "text-slate-400"}>{preparing ? "● Cooking" : "○ Waiting"}</span>
      </div>

      {/* Body */}
      <ul className="flex-1 space-y-3 px-4 py-3">
        {order.items.map((i) => (
          <li key={i.id}>
            <p className="flex items-baseline gap-2 text-xl leading-tight">
              <span className="shrink-0 font-black text-amber-300">{i.quantity}x</span>
              <span className="font-bold text-white">{splitSnapshot(i.item_name_snapshot, "en")}</span>
            </p>
            {i.selected_combo_options?.map((s) => (
              <p key={s.step_number} className="ml-8 mt-0.5 text-base text-slate-300">
                ↳ {shortStep(s.step_title_en)}: <span className="font-bold text-white">{s.options.map((o) => o.name_en).join(", ")}</span>
              </p>
            ))}
            {i.item_notes && <p className="ml-8 mt-0.5 text-base font-semibold text-amber-300">↳ Note: {i.item_notes}</p>}
          </li>
        ))}
      </ul>

      {order.customer_notes && (
        <div className="mx-4 mb-3 rounded border border-amber-600 bg-amber-950/60 p-2 text-sm font-medium text-amber-200">
          📝 {order.customer_notes}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 pt-0">
        {preparing ? (
          <button
            onClick={() => onAdvance(order, "served")}
            disabled={busy}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-black uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-6 animate-spin" /> : <HandPlatter className="size-6" />} Mark Ready / Served
          </button>
        ) : (
          <button
            onClick={() => onAdvance(order, "preparing")}
            disabled={busy}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-lg font-black uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ChefHat className="size-6" />} Start Preparing
          </button>
        )}
      </div>
    </article>
  );
});
