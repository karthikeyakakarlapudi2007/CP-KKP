"use client";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { formatINR, pick } from "@/lib/utils";
import { cartCount, cartTotal, useCart } from "@/stores/cart";
import { ComboSummary } from "./ComboSummary";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lang: Lang;
  tableId: number;
  placing: boolean;
  error: string | null;
  onPlaceOrder: () => void;
};

export function CartDrawer({ open, onOpenChange, lang, tableId, placing, error, onPlaceOrder }: Props) {
  const { lines, notes, increment, decrement, remove, setNotes } = useCart();
  const total = cartTotal(lines);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" aria-describedby="cart-desc">
        <div className="border-b px-5 pb-3 pt-5">
          <DialogTitle>{t("yourCart", lang)}</DialogTitle>
          <DialogDescription id="cart-desc">
            {t("table", lang)} {tableId} · {cartCount(lines)} {t("items", lang)}
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <ShoppingBag className="size-10" />
              <p>{t("cartEmpty", lang)}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{pick(l, "name", lang)}</p>
                    <ComboSummary steps={l.selected_steps} lang={lang} />
                    <p className="mt-1 text-sm font-bold">{formatINR(l.unit_price * l.quantity)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex h-8 items-center rounded-lg border">
                      <button className="px-2" onClick={() => decrement(l.key)} aria-label="Decrease"><Minus className="size-4" /></button>
                      <span className="w-6 text-center text-sm font-bold">{l.quantity}</span>
                      <button className="px-2" onClick={() => increment(l.key)} aria-label="Increase"><Plus className="size-4" /></button>
                    </div>
                    <button onClick={() => remove(l.key)} className="flex items-center gap-1 text-xs text-destructive">
                      <Trash2 className="size-3" /> {t("remove", lang)}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <Label htmlFor="prep-notes">{t("prepNotes", lang)}</Label>
              <Textarea
                id="prep-notes"
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("prepNotesPlaceholder", lang)}
              />
            </div>
          )}
        </div>

        <div className="space-y-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
          <Button size="lg" className="w-full justify-between" disabled={!lines.length || placing} onClick={onPlaceOrder}>
            <span className="flex items-center gap-2">
              {placing && <Spinner className="size-4 text-white" />}
              {placing ? t("placing", lang) : t("placeOrder", lang)}
            </span>
            <span>{formatINR(total)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
