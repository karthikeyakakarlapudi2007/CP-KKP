"use client";
import { ShoppingBag } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { cartCount, cartTotal, useCart } from "@/stores/cart";

export function CartBar({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  const lines = useCart((s) => s.lines);
  const count = cartCount(lines);
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl shadow-primary/30 active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="relative">
            <ShoppingBag className="size-6" />
            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-black text-accent-foreground">
              {count}
            </span>
          </span>
          <span className="text-left leading-tight">
            <span className="block text-xs opacity-80">{count} {t("items", lang)}</span>
            <span className="block text-lg font-extrabold">{formatINR(cartTotal(lines))}</span>
          </span>
        </span>
        <span className="font-bold">{t("viewCart", lang)} →</span>
      </button>
    </div>
  );
}
