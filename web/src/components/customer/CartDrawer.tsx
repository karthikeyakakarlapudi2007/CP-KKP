"use client";
import { useState } from "react";
import { ChevronUp, Minus, NotebookPen, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { formatINR } from "@/lib/utils";
import { cartCount, cartTotal, useCustomerStore, type CartItem } from "@/store/useCustomerStore";
import { ComboSummary } from "./ComboSummary";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placing: boolean;
  error: string | null;
  onPlaceOrder: () => void;
};

function CartLine({ line }: { line: CartItem }) {
  const { t, lang } = useTranslation();
  const { incrementItem, decrementItem, removeItem, setItemNotes } = useCustomerStore();
  const [noteOpen, setNoteOpen] = useState(Boolean(line.specialNotes));

  return (
    <li className="animate-pop py-3">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{line.name[lang]}</p>
          <ComboSummary steps={line.selectedComboOptions} lang={lang} />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatINR(line.unitPrice)} × {line.quantity} ={" "}
            <span className="text-sm font-bold text-foreground">{formatINR(line.unitPrice * line.quantity)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex h-9 items-center rounded-lg border bg-card">
            <button className="flex h-full w-9 items-center justify-center" onClick={() => decrementItem(line.id)} aria-label={`${line.name.en} −1`}>
              <Minus className="size-4" />
            </button>
            <span key={line.quantity} className="w-7 animate-bump text-center text-sm font-black">{line.quantity}</span>
            <button className="flex h-full w-9 items-center justify-center" onClick={() => incrementItem(line.id)} aria-label={`${line.name.en} +1`}>
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex gap-3 text-xs">
            {!noteOpen && (
              <button onClick={() => setNoteOpen(true)} className="flex items-center gap-1 text-muted-foreground">
                <NotebookPen className="size-3" /> {t("addNote")}
              </button>
            )}
            <button onClick={() => removeItem(line.id)} className="flex items-center gap-1 text-destructive">
              <Trash2 className="size-3" /> {t("remove")}
            </button>
          </div>
        </div>
      </div>
      {noteOpen && (
        <Input
          autoFocus={!line.specialNotes}
          value={line.specialNotes}
          maxLength={200}
          onChange={(e) => setItemNotes(line.id, e.target.value)}
          placeholder={t("itemNotePlaceholder")}
          aria-label={`${t("notes")}: ${line.name.en}`}
          className="mt-2 h-8 text-xs"
        />
      )}
    </li>
  );
}

/** Sticky bottom bar (count + live total) that expands into the slide-up cart. */
export function CartDrawer({ open, onOpenChange, placing, error, onPlaceOrder }: Props) {
  const { t } = useTranslation();
  const cart = useCustomerStore((s) => s.cart);
  const orderNotes = useCustomerStore((s) => s.orderNotes);
  const setOrderNotes = useCustomerStore((s) => s.setOrderNotes);
  const tableNumber = useCustomerStore((s) => s.tableNumber);
  const count = cartCount(cart);
  const total = cartTotal(cart);

  return (
    <>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg animate-slide-up px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => onOpenChange(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl shadow-primary/30 transition-transform active:scale-[0.98]"
            aria-label={`${t("viewCart")} — ${count} ${t("items")}, ${formatINR(total)}`}
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <ShoppingBag className="size-6" />
                <span key={count} className="absolute -right-2 -top-2 flex size-5 animate-bump items-center justify-center rounded-full bg-accent text-[11px] font-black text-accent-foreground">
                  {count}
                </span>
              </span>
              <span className="text-left leading-tight">
                <span className="block text-xs opacity-85">
                  {count} {count === 1 ? t("item") : t("items")}
                </span>
                <span className="block text-lg font-extrabold">{formatINR(total)}</span>
              </span>
            </span>
            <span className="flex items-center gap-1 font-bold">
              {t("viewCart")} <ChevronUp className="size-4" />
            </span>
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent side="bottom" aria-describedby="cart-desc">
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
          <div className="border-b px-5 pb-3 pt-3">
            <DialogTitle>{t("yourCart")}</DialogTitle>
            <DialogDescription id="cart-desc">
              {t("table")} #{tableNumber} · {count} {t("items")}
            </DialogDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ShoppingBag className="size-10" />
                <p>{t("cartEmpty")}</p>
              </div>
            ) : (
              <>
                <ul className="divide-y">
                  {cart.map((line) => (
                    <CartLine key={line.id} line={line} />
                  ))}
                </ul>
                <div className="mt-2 space-y-1.5 pb-2">
                  <Label htmlFor="order-notes" className="flex items-center gap-1.5">
                    <NotebookPen className="size-4 text-primary" /> {t("specialInstructions")}
                  </Label>
                  <Textarea
                    id="order-notes"
                    value={orderNotes}
                    maxLength={500}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={t("instructionsPlaceholder")}
                    className="min-h-20"
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">{t("total")}</span>
              <span className="text-2xl font-black">{formatINR(total)}</span>
            </div>
            {error && (
              <p role="alert" className="animate-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <Button size="lg" className="h-13 w-full text-base" disabled={!cart.length || placing} onClick={onPlaceOrder}>
              {placing ? <><Spinner className="size-5 text-white" /> {t("placing")}</> : t("placeOrder")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
