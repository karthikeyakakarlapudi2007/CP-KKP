"use client";
import { create } from "zustand";

export type BillAlert = { table: number; amountDue: number; at: number };

type AdminState = {
  /** open "TABLE # REQUESTED BILL" alerts, keyed by table number */
  billAlerts: Record<number, BillAlert>;
  raiseBillAlert: (a: BillAlert) => void;
  clearBillAlert: (table: number) => void;
  setBillAlerts: (alerts: BillAlert[]) => void;
};

export const useAdminStore = create<AdminState>()((set, get) => ({
  billAlerts: {},
  raiseBillAlert: (a) => set({ billAlerts: { ...get().billAlerts, [a.table]: a } }),
  clearBillAlert: (table) => {
    if (!(table in get().billAlerts)) return;
    const next = { ...get().billAlerts };
    delete next[table];
    set({ billAlerts: next });
  },
  setBillAlerts: (alerts) => set({ billAlerts: Object.fromEntries(alerts.map((a) => [a.table, a])) }),
}));
