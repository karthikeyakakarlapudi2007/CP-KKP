"use client";
import { Ban, Layers, Minus, Plus } from "lucide-react";
import { DishImage } from "@/components/shared/DishImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import type { MenuItem } from "@/lib/types";
import { cn, formatINR, pick } from "@/lib/utils";

type Props = {
  item: MenuItem;
  /** quantity of this plain (non-combo) dish already in the cart */
  inCart: number;
  onAdd: () => void;
  onDecrement: () => void;
};

export function MenuItemCard({ item, inCart, onAdd, onDecrement }: Props) {
  const { t, lang } = useTranslation();
  const off = !item.is_available;
  const desc = pick(item, "description", lang);

  return (
    <article
      aria-disabled={off}
      className={cn(
        "flex gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all duration-300",
        off && "bg-muted/40 opacity-60 grayscale",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.is_combo && (
            <Badge variant="accent">
              <Layers className="size-3" /> {t("combo")}
            </Badge>
          )}
          <Badge variant={off ? "destructive" : "success"} className="transition-colors">
            <span className={cn("size-1.5 rounded-full", off ? "bg-destructive" : "bg-success")} aria-hidden />
            {off ? t("outOfStockShort") : t("available")}
          </Badge>
        </div>
        <h3 className="mt-1.5 font-bold leading-snug">{pick(item, "name", lang)}</h3>
        {desc && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
        <p className="mt-2 font-extrabold text-primary">
          {item.is_combo && <span className="mr-1 text-xs font-medium text-muted-foreground">{t("from")}</span>}
          {formatINR(item.price)}
        </p>
      </div>

      <div className="flex w-28 shrink-0 flex-col items-center">
        <DishImage src={item.image_url} className="h-24 w-28 rounded-xl" />
        <div className="-mt-4 w-[6.5rem]">
          {off ? (
            <Button size="sm" variant="outline" disabled className="w-full whitespace-normal px-1 text-[11px] leading-tight opacity-100 shadow-md">
              <Ban className="!size-3" /> {t("outOfStock")}
            </Button>
          ) : item.is_combo || inCart === 0 ? (
            <Button size="sm" variant={item.is_combo ? "accent" : "default"} className="w-full shadow-md" onClick={onAdd}>
              {item.is_combo ? t("customize") : <><Plus /> {t("add")}</>}
            </Button>
          ) : (
            <div className="flex h-8 w-full animate-pop items-center justify-between rounded-md bg-primary text-primary-foreground shadow-md">
              <button className="h-full px-2.5" onClick={onDecrement} aria-label="−1">
                <Minus className="size-4" />
              </button>
              <span key={inCart} className="animate-bump text-sm font-black" aria-live="polite">{inCart}</span>
              <button className="h-full px-2.5" onClick={onAdd} aria-label="+1">
                <Plus className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
