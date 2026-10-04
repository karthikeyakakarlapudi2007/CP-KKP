"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Order } from "@/lib/types";
import { ThermalReceipt } from "./ThermalReceipt";

type Props = { tableNumber: number | null; orders: Order[]; onClose: () => void };

const PX_PER_MM = 96 / 25.4;
const PAGE_STYLE_ID = "receipt-page-size";

/**
 * Preview + print for the 80mm bill. While printing, the body gets `printing-receipt`, which hides
 * everything except #receipt-print-root, and a temporary @page rule sizes the paper to exactly
 * 80mm × receipt height so thermal printers don't feed a blank A4-length strip.
 */
export function ReceiptDialog({ tableNumber, orders, onClose }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [printedAt, setPrintedAt] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (tableNumber) setPrintedAt(new Date());
  }, [tableNumber]);

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove("printing-receipt");
      document.getElementById(PAGE_STYLE_ID)?.remove();
    };
    window.addEventListener("afterprint", cleanup);
    return () => {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, []);

  if (!tableNumber) return null;

  const print = () => {
    const now = new Date();
    setPrintedAt(now);
    // let React paint the fresh timestamp, then size the page from the preview's real height
    requestAnimationFrame(() => {
      const heightMm = Math.ceil((previewRef.current?.scrollHeight ?? 600) / PX_PER_MM) + 6;
      let style = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = PAGE_STYLE_ID;
        document.head.appendChild(style);
      }
      style.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
      document.body.classList.add("printing-receipt");
      window.print();
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md" aria-describedby="receipt-desc">
          <div className="flex max-h-[90dvh] flex-col">
            <div className="border-b p-5 pr-12">
              <DialogTitle>Bill · Table {tableNumber}</DialogTitle>
              <DialogDescription id="receipt-desc">80mm thermal receipt preview — all open rounds combined.</DialogDescription>
            </div>
            <div className="flex-1 overflow-y-auto bg-stone-200 p-5">
              <div className="mx-auto w-fit shadow-lg">
                <ThermalReceipt ref={previewRef} tableNumber={tableNumber} orders={orders} printedAt={printedAt} />
              </div>
            </div>
            <div className="flex gap-2 border-t p-4">
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
              <Button className="flex-1" onClick={print} disabled={orders.length === 0}>
                <Printer /> Print Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {mounted &&
        createPortal(
          <div id="receipt-print-root" aria-hidden>
            <ThermalReceipt tableNumber={tableNumber} orders={orders} printedAt={printedAt} />
          </div>,
          document.body,
        )}
    </>
  );
}
