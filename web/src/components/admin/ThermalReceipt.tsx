import { forwardRef } from "react";
import { computeBill, GST_RATE, ordersSubtotal } from "@/lib/billing";
import type { Order } from "@/lib/types";
import { splitSnapshot } from "@/lib/utils";

type Line = { name: string; detail: string | null; qty: number; unit: number; total: number };

/** Merge identical dishes (same build + price) across rounds into one receipt line. */
export function receiptLines(orders: Order[]): Line[] {
  const map = new Map<string, Line>();
  for (const o of [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    for (const i of o.items) {
      const detail = i.selected_combo_options?.length
        ? i.selected_combo_options.map((s) => s.options.map((op) => op.name_en).join(", ")).join(" + ")
        : null;
      const key = `${i.item_name_snapshot}|${detail ?? ""}|${i.unit_price}`;
      const line = map.get(key) ?? { name: splitSnapshot(i.item_name_snapshot, "en"), detail, qty: 0, unit: i.unit_price, total: 0 };
      line.qty += i.quantity;
      line.total = Math.round(line.qty * line.unit * 100) / 100;
      map.set(key, line);
    }
  }
  return [...map.values()];
}

const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function billNumber(table: number, orders: Order[], at: Date) {
  const first = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const ymd = `${at.getFullYear() % 100}${String(at.getMonth() + 1).padStart(2, "0")}${String(at.getDate()).padStart(2, "0")}`;
  return `T${table}-${ymd}-${(first?.id ?? "000000").slice(0, 4).toUpperCase()}`;
}

type Props = { tableNumber: number; orders: Order[]; printedAt: Date };

/**
 * Standard 80mm thermal bill: monochrome, monospace, fixed paper width.
 * Rendered both in the on-screen preview and in the print-only root (see ReceiptDialog).
 */
export const ThermalReceipt = forwardRef<HTMLDivElement, Props>(function ThermalReceipt({ tableNumber, orders, printedAt }, ref) {
  const lines = receiptLines(orders);
  const bill = computeBill(ordersSubtotal(orders));
  const rounds = new Set(orders.map((o) => o.round ?? 1)).size;
  const date = printedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = printedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div ref={ref} className="thermal-receipt" data-testid="thermal-receipt">
      <header className="tr-center">
        <p className="tr-brand">KODIKURA PAPPUCHARU</p>
        <p className="tr-sub">Authentic Telugu Cuisine - Vijayawada</p>
        <p className="tr-sub">Dine-in · Pay at table</p>
      </header>

      <div className="tr-rule" />
      <div className="tr-row tr-small">
        <span>Date: {date}</span>
        <span>Time: {time}</span>
      </div>
      <div className="tr-row tr-small">
        <span>Bill: {billNumber(tableNumber, orders, printedAt)}</span>
        <span>{rounds > 1 ? `${rounds} rounds` : "1 round"}</span>
      </div>
      <p className="tr-table">TABLE: #{tableNumber}</p>
      <div className="tr-rule" />

      <table className="tr-items">
        <thead>
          <tr>
            <th className="tr-l">Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => (
            <tr key={idx}>
              <td className="tr-l">
                {l.name}
                {l.detail && <span className="tr-detail">({l.detail})</span>}
              </td>
              <td>{l.qty}</td>
              <td>{money(l.unit)}</td>
              <td>{money(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tr-rule" />
      <div className="tr-row"><span>Subtotal (₹)</span><span>{money(bill.subtotal)}</span></div>
      {GST_RATE > 0 && (
        <>
          <div className="tr-row"><span>CGST ({bill.halfRate}%)</span><span>{money(bill.cgst)}</span></div>
          <div className="tr-row"><span>SGST ({bill.halfRate}%)</span><span>{money(bill.sgst)}</span></div>
        </>
      )}
      <div className="tr-row"><span>Round off</span><span>{bill.roundOff >= 0 ? "+" : "-"}{money(Math.abs(bill.roundOff))}</span></div>
      <div className="tr-rule tr-rule-bold" />
      <div className="tr-row tr-net">
        <span>NET PAYABLE (₹)</span>
        <span>{money(bill.netPayable)}</span>
      </div>
      <div className="tr-rule tr-rule-bold" />
      <p className="tr-center tr-small">Items: {lines.reduce((n, l) => n + l.qty, 0)} · Cash / UPI / Card at table</p>

      <footer className="tr-center tr-footer">
        <p>Thank You! Visit Again</p>
        <p lang="te">ధన్యవాదాలు</p>
      </footer>
    </div>
  );
});
