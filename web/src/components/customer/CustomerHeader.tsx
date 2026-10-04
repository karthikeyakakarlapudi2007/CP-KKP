"use client";
import { ClipboardList, UtensilsCrossed, WifiOff } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { LangToggle } from "./LangToggle";

type Props = {
  tableNumber: number;
  view: "menu" | "status";
  onViewChange: (v: "menu" | "status") => void;
  hasActiveOrder: boolean;
  connected: boolean;
};

export function CustomerHeader({ tableNumber, view, onViewChange, hasActiveOrder, connected }: Props) {
  const { t } = useTranslation();
  return (
    <div className="bg-background">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xl shadow-sm" aria-hidden>
          🍲
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold leading-tight text-primary">{t("appName")}</h1>
          <span className="mt-0.5 inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-black text-accent-foreground">
            {t("table")} #{tableNumber}
          </span>
        </div>
        <LangToggle />
      </div>

      {hasActiveOrder && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-2">
          {(["menu", "status"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-colors",
                view === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {v === "menu" ? <UtensilsCrossed className="size-4" /> : <ClipboardList className="size-4" />}
              {v === "menu" ? t("menu") : t("trackOrder")}
              {v === "status" && view !== "status" && <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />}
            </button>
          ))}
        </div>
      )}

      {!connected && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 py-1 text-xs font-semibold text-amber-900">
          <WifiOff className="size-3" /> {t("offline")}
        </div>
      )}
    </div>
  );
}
