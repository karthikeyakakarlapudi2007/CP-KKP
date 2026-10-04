"use client";
import { ChefHat, Clock, HandPlatter, MessageSquareWarning } from "lucide-react";
import type { Order } from "@/lib/types";
import { cn, minutesSince, splitSnapshot } from "@/lib/utils";

type Props = { order: Order; now: number; busy: boolean; onAdvance: () => void };

function urgency(mins: number) {
  if (mins > 15) return { ring: "border-red-500 shadow-red-900/50", head: "bg-red-600", text: "text-red-100", pulse: true };
  if (mins >= 8) return { ring: "border-amber-500", head: "bg-amber-500 text-black", text: "text-black/80", pulse: false };
  return { ring: "border-emerald-600", head: "bg-emerald-700", text: "text-emerald-100", pulse: false };
}

export function KdsTicket({ order, now, busy, onAdvance }: Props) {
  const mins = minutesSince(order.created_at, now);
  const u = urgency(mins);
  const preparing = order.status === "preparing";

  return (
    <button
      onClick={onAdvance}
      disabled={busy}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border-4 bg-neutral-900 text-left shadow-xl transition active:scale-[0.98] disabled:opacity-60",
        u.ring,
        u.pulse && "animate-[pulse_2s_ease-in-out_infinite]",
      )}
      aria-label={`Table ${order.table_number}, ${preparing ? "mark served" : "start preparing"}`}
    >
      <div className={cn("flex items-center justify-between px-4 py-3", u.head)}>
        <span className="text-4xl font-black tracking-tight">TABLE #{order.table_number}</span>
        <span className={cn("flex items-center gap-1 text-lg font-bold", u.text)}>
          <Clock className="size-5" />
          {mins === 0 ? "now" : `${mins} min${mins === 1 ? "" : "s"} ago`}
        </span>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400">
        <span>#{order.id.slice(0, 6)}</span>
        <span className={preparing ? "text-sky-400" : "text-neutral-300"}>{preparing ? "● Preparing" : "○ New"}</span>
      </div>

      <ul className="flex-1 space-y-3 px-4 py-3">
        {order.items.map((i) => (
          <li key={i.id}>
            <p className="text-xl font-extrabold leading-tight text-white">
              <span className="mr-2 inline-block min-w-12 rounded bg-white px-1.5 text-center text-neutral-950">x{i.quantity}</span>
              {splitSnapshot(i.item_name_snapshot, "en")}
            </p>
            {i.selected_combo_options?.length ? (
              <ul className="ml-14 mt-1 space-y-0.5 text-base text-neutral-200">
                {i.selected_combo_options.map((s) => (
                  <li key={s.step_number}>
                    <span className="text-neutral-400">{s.step_title_en}:</span>{" "}
                    <span className="font-bold">{s.options.map((o) => o.name_en).join(", ")}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {i.item_notes && <p className="ml-14 mt-1 font-bold text-amber-300">↳ {i.item_notes}</p>}
          </li>
        ))}
      </ul>

      {order.customer_notes && (
        <div className="mx-3 mb-3 flex gap-2 rounded-lg border-2 border-amber-400 bg-amber-400/10 px-3 py-2 text-lg font-bold text-amber-300">
          <MessageSquareWarning className="mt-1 size-5 shrink-0" />
          <span>{order.customer_notes}</span>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-center gap-2 py-3 text-lg font-black uppercase tracking-wide",
          preparing ? "bg-emerald-600 text-white" : "bg-sky-600 text-white",
        )}
      >
        {preparing ? <><HandPlatter className="size-6" /> Tap: Ready / Served</> : <><ChefHat className="size-6" /> Tap: Start Preparing</>}
      </div>
    </button>
  );
}
