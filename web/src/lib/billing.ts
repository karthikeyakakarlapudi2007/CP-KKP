import type { Order } from "./types";

/**
 * Restaurant GST (CGST + SGST, split equally). Menu prices are pre-tax.
 * Set NEXT_PUBLIC_GST_RATE=0 if your prices already include tax.
 */
const parsed = Number(process.env.NEXT_PUBLIC_GST_RATE ?? 5);
export const GST_RATE = Number.isFinite(parsed) && parsed >= 0 && parsed <= 28 ? parsed : 5;

export type Bill = {
  subtotal: number;
  cgst: number;
  sgst: number;
  /** signed: + rounds up, − rounds down */
  roundOff: number;
  netPayable: number;
  halfRate: number;
};

/** All maths in paise so 2.5% splits and round-off never drift by a paisa. */
export function computeBill(subtotal: number): Bill {
  const sub = Math.round(subtotal * 100);
  const halfRate = GST_RATE / 2;
  const cgst = Math.round((sub * halfRate) / 100);
  const sgst = cgst;
  const gross = sub + cgst + sgst;
  const net = Math.round(gross / 100) * 100; // nearest rupee
  return { subtotal: sub / 100, cgst: cgst / 100, sgst: sgst / 100, roundOff: (net - gross) / 100, netPayable: net / 100, halfRate };
}

export const ordersSubtotal = (orders: Pick<Order, "total_amount">[]) =>
  Math.round(orders.reduce((s, o) => s + o.total_amount * 100, 0)) / 100;

/** Net payable (incl. GST, rounded) for a set of open tickets. */
export const amountPayable = (orders: Pick<Order, "total_amount">[]) => computeBill(ordersSubtotal(orders)).netPayable;
