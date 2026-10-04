"use client";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { computeBill } from "@/lib/billing";
import { playSound } from "@/lib/chime";
import { EVENTS } from "@/lib/events";
import { formatINR } from "@/lib/utils";
import { useAdminStore } from "@/store/useAdminStore";
import { useStaffStore } from "@/store/useStaffStore";

/**
 * Dashboard-wide listener: whichever tab is open, a bill request rings and raises a
 * high-priority "TABLE # REQUESTED BILL" banner until the table is settled.
 */
export function BillAlertBanner() {
  const staffKey = useStaffStore((s) => s.key);
  const alerts = useAdminStore((s) => s.billAlerts);
  const { raiseBillAlert, clearBillAlert, setBillAlerts } = useAdminStore();

  const sync = useCallback(async () => {
    try {
      const tables = await api.tables();
      setBillAlerts(
        tables
          .filter((t) => t.status === "bill_requested")
          .map((t) => ({ table: t.id, amountDue: computeBill(t.amount_due).netPayable, at: Date.now() })),
      );
    } catch {
      /* the tabs surface load errors */
    }
  }, [setBillAlerts]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useSocket(
    { role: "admin", staffKey },
    {
      [EVENTS.TABLE_BILL_REQUESTED]: (p: { table_number: number; amount_due: number }) => {
        raiseBillAlert({ table: p.table_number, amountDue: computeBill(p.amount_due).netPayable, at: Date.now() });
        if (useStaffStore.getState().soundOn) void playSound("billAlert");
      },
      [EVENTS.TABLE_STATUS_UPDATED]: (p: { id: number; status: string }) => {
        if (p.status !== "bill_requested") clearBillAlert(p.id);
      },
      [EVENTS.ORDER_CREATED]: () => {
        if (useStaffStore.getState().soundOn) void playSound("newOrder");
      },
      [EVENTS.ORDER_ADDON_CREATED]: () => {
        if (useStaffStore.getState().soundOn) void playSound("newOrder");
      },
    },
    sync,
  );

  const list = Object.values(alerts).sort((a, b) => a.at - b.at);
  if (!list.length) return null;

  return (
    <div role="alert" aria-live="assertive" className="border-t-2 border-amber-500 bg-amber-300 text-amber-950">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-6 py-2.5">
        <BellRing className="size-6 animate-bounce" />
        {list.map((a) => (
          <span key={a.table} className="flex animate-pop items-center gap-1 rounded-xl bg-amber-950 py-1 pl-3 pr-1 text-amber-100 shadow">
            <Link href={`/admin?tab=orders&table=${a.table}`} className="font-black tracking-wide">
              TABLE {a.table} REQUESTED BILL · {formatINR(a.amountDue)}
            </Link>
            <button onClick={() => clearBillAlert(a.table)} className="rounded-lg p-1 hover:bg-amber-900" aria-label={`Dismiss table ${a.table} alert`}>
              <X className="size-4" />
            </button>
          </span>
        ))}
        <span className="ml-auto text-sm font-semibold">Tap a table to collect payment</span>
      </div>
    </div>
  );
}
