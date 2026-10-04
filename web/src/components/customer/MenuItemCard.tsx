"use client";
import { Layers, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DishImage } from "@/components/shared/DishImage";
import { t } from "@/lib/i18n";
import type { Lang, MenuItem } from "@/lib/types";
import { cn, formatINR, pick } from "@/lib/utils";

type Props = {
  item: MenuItem;
  lang: Lang;
  /** quantity of this (non-combo) item already in the cart */
  inCart: number;
  onAdd: () => void;
  onDecrement: () => void;
};

export function MenuItemCard({ item, lang, inCart, onAdd, onDecrement }: Props) {
  const off = !item.is_available;
  const desc = pick(item, "description", lang);
  return (
    <article
      className={cn(
        "flex gap-3 rounded-2xl border bg-card p-3 shadow-sm transition",
        off && "pointer-events-none opacity-50 grayscale",
      )}
      aria-disabled={off}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.is_combo && (
            <Badge variant="accent">
              <Layers className="size-3" /> {t("combo", lang)}
            </Badge>
          )}
          {off && <Badge variant="destructive">{t("outOfStock", lang)}</Badge>}
        </div>
        <h3 className="mt-1 font-bold leading-snug">{pick(item, "name", lang)}</h3>
        {desc && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</p>}
        <p className="mt-2 font-extrabold text-primary">
          {item.is_combo && <span className="mr-1 text-xs font-medium text-muted-foreground">from</span>}
          {formatINR(item.price)}
        </p>
      </div>

      <div className="flex w-28 shrink-0 flex-col items-center gap-2">
        <DishImage src={item.image_url} className="h-20 w-28 rounded-xl" />
        {off ? (
          <span className="text-xs font-bold text-destructive">{t("outOfStock", lang)}</span>
        ) : item.is_combo || inCart === 0 ? (
          <Button size="sm" variant={item.is_combo ? "accent" : "default"} className="-mt-5 w-24 shadow-md" onClick={onAdd}>
            {item.is_combo ? t("customize", lang) : <><Plus /> {t("add", lang)}</>}
          </Button>
        ) : (
          <div className="-mt-5 flex h-8 w-24 items-center justify-between rounded-md bg-primary text-primary-foreground shadow-md">
            <button className="px-2" onClick={onDecrement} aria-label="Decrease"><Minus className="size-4" /></button>
            <span className="text-sm font-bold">{inCart}</span>
            <button className="px-2" onClick={onAdd} aria-label="Increase"><Plus className="size-4" /></button>
          </div>
        )}
      </div>
    </article>
  );
}
