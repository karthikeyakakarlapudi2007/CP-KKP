"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import type { Lang, MenuItem, SelectedStep } from "@/lib/types";
import { cn, formatINR, pick } from "@/lib/utils";

type Props = {
  item: MenuItem | null;
  lang: Lang;
  onClose: () => void;
  onAdd: (item: MenuItem, selections: Record<string, string[]>, steps: SelectedStep[], unitPrice: number) => void;
};

export function ComboBuilder({ item, lang, onClose, onAdd }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setStepIndex(0);
    setPicks({});
    setShowHint(false);
  }, [item?.id]);

  const steps = useMemo(() => [...(item?.combo_steps ?? [])].sort((a, b) => a.step_number - b.step_number), [item]);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    return steps.reduce((sum, s) => {
      const ids = picks[s.step_number] ?? [];
      return sum + s.options.filter((o) => ids.includes(o.id)).reduce((a, o) => a + o.additional_price, 0);
    }, item.price);
  }, [item, steps, picks]);

  if (!item) return null;

  const current = step ? picks[step.step_number] ?? [] : [];
  const stepValid = !step || !step.is_required || current.length > 0;

  const toggle = (optionId: string) => {
    if (!step) return;
    setShowHint(false);
    setPicks((prev) => {
      const sel = prev[step.step_number] ?? [];
      let next: string[];
      if (step.max_select === 1) next = sel[0] === optionId && !step.is_required ? [] : [optionId];
      else if (sel.includes(optionId)) next = sel.filter((id) => id !== optionId);
      else if (sel.length < step.max_select) next = [...sel, optionId];
      else next = sel;
      return { ...prev, [step.step_number]: next };
    });
  };

  const goNext = () => {
    if (!stepValid) return setShowHint(true);
    if (!isLast) return setStepIndex((i) => i + 1);
    // every required step must be satisfied before the item enters the cart
    const firstMissing = steps.findIndex((s) => s.is_required && !(picks[s.step_number]?.length));
    if (firstMissing >= 0) {
      setStepIndex(firstMissing);
      return setShowHint(true);
    }
    const selections: Record<string, string[]> = {};
    const chosen: SelectedStep[] = [];
    for (const s of steps) {
      const ids = picks[s.step_number] ?? [];
      if (!ids.length) continue;
      selections[String(s.step_number)] = ids;
      chosen.push({
        step_number: s.step_number,
        step_title_en: s.step_title_en,
        step_title_te: s.step_title_te,
        options: s.options.filter((o) => ids.includes(o.id)),
      });
    }
    onAdd(item, selections, chosen, unitPrice);
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent side="bottom" aria-describedby="combo-desc">
        <div className="border-b px-5 pb-3 pt-5 pr-12">
          <DialogTitle>{pick(item, "name", lang)}</DialogTitle>
          <DialogDescription id="combo-desc">
            {t("step", lang)} {stepIndex + 1} {t("of", lang)} {steps.length}
          </DialogDescription>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <div key={s.step_number} className={cn("h-1.5 flex-1 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>

        {step && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-base font-bold">{pick(step, "step_title", lang)}</h3>
              <span className={cn("shrink-0 text-xs font-semibold", step.is_required ? "text-primary" : "text-muted-foreground")}>
                {step.is_required ? t("required", lang) : t("optional", lang)}
                {step.max_select > 1 && ` · ${t("pickUpTo", lang)} ${step.max_select}`}
              </span>
            </div>
            <div className="grid gap-2" role={step.max_select === 1 ? "radiogroup" : "group"}>
              {step.options.map((o) => {
                const selected = current.includes(o.id);
                const blocked = !selected && step.max_select > 1 && current.length >= step.max_select;
                return (
                  <button
                    key={o.id}
                    role={step.max_select === 1 ? "radio" : "checkbox"}
                    aria-checked={selected}
                    disabled={blocked}
                    onClick={() => toggle(o.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition",
                      selected ? "border-primary bg-primary/5" : "border-border",
                      blocked && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center border-2",
                        step.max_select === 1 ? "rounded-full" : "rounded-md",
                        selected ? "border-primary bg-primary text-white" : "border-muted-foreground/40",
                      )}
                    >
                      {selected && <Check className="size-3" strokeWidth={4} />}
                    </span>
                    <span className="flex-1 font-semibold">{pick(o, "name", lang)}</span>
                    <span className="text-sm text-muted-foreground">{o.additional_price > 0 ? `+${formatINR(o.additional_price)}` : ""}</span>
                  </button>
                );
              })}
            </div>
            {showHint && !stepValid && (
              <p role="alert" className="mt-3 text-sm font-semibold text-destructive">{t("selectToContinue", lang)}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {stepIndex > 0 && (
            <Button variant="outline" size="lg" className="px-3" onClick={() => setStepIndex((i) => i - 1)} aria-label={t("back", lang)}>
              <ChevronLeft />
            </Button>
          )}
          <Button size="lg" className="flex-1 justify-between" onClick={goNext} aria-disabled={!stepValid}>
            <span>{isLast ? t("addToCart", lang) : t("next", lang)}</span>
            <span className="flex items-center gap-1">
              {formatINR(unitPrice)} {!isLast && <ChevronRight />}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
