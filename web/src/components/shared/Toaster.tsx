"use client";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/useToastStore";

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info } as const;

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="no-print pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            data-toast={t.kind}
            className={cn(
              "pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
              t.kind === "success" && "border-success/30 bg-card",
              t.kind === "error" && "border-destructive/40 bg-red-50",
              t.kind === "info" && "bg-card",
            )}
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", t.kind === "success" ? "text-success" : t.kind === "error" ? "text-destructive" : "text-primary")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
