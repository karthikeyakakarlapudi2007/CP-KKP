"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";
import type { ComboStep, MenuItem, SelectedStep } from "@/lib/types";
import { cn, formatINR, pick } from "@/lib/utils";

type Props = {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, combo: { steps: SelectedStep[]; unitPrice: number }) => void;
};

/** Step-by-step builder for `is_combo` dishes (e.g. Step 1 Base → Step 2 Curry). */
export function ComboBuilderModal({ item, onClose, onAdd }: Props) {
  const { t, lang } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<Record<number, string[]>>({});

  // fresh form each time a combo opens
  useEffect(() => {
    setStepIndex(0);
    setPicks({});
  }, [item?.id]);

  const steps = useMemo(() => [...(item?.combo_steps ?? [])].sort((a, b) => a.step_number - b.step_number), [item]);
  const isComplete = (s: ComboStep) => !s.is_required || (picks[s.step_number]?.length ?? 0) > 0;
  const allComplete = steps.every(isComplete);

  const addOns = useMemo(
    () =>
      steps.flatMap((s) =>
        s.options.filter((o) => picks[s.step_number]?.includes(o.id) && o.additional_price > 0),
      ),
    [steps, picks],
  );
  const unitPrice = (item?.price ?? 0) + addOns.reduce((sum, o) => sum + o.additional_price, 0);

  if (!item) return null;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const current = step ? picks[step.step_number] ?? [] : [];
  const single = step?.max_select === 1;

  const choose = (optionId: string) => {
    if (!step) return;
    setPicks((prev) => {
      const sel = prev[step.step_number] ?? [];
      let next: string[];
      if (single) next = sel[0] === optionId && !step.is_required ? [] : [optionId];
      else if (sel.includes(optionId)) next = sel.filter((id) => id !== optionId);
      else next = sel.length < step.max_select ? [...sel, optionId] : sel;
      return { ...prev, [step.step_number]: next };
    });
  };

  const submit = () => {
    if (!allComplete) {
      const firstMissing = steps.findIndex((s) => !isComplete(s));
      if (firstMissing >= 0) setStepIndex(firstMissing);
      return;
    }
    const chosen: SelectedStep[] = steps
      .map((s) => ({
        step_number: s.step_number,
        step_title_en: s.step_title_en,
        step_title_te: s.step_title_te,
        options: s.options.filter((o) => picks[s.step_number]?.includes(o.id)),
      }))
      .filter((s) => s.options.length > 0);
    onAdd(item, { steps: chosen, unitPrice });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent side="bottom" aria-describedby="combo-step-label">
        {/* Header + progress */}
        <div className="border-b px-5 pb-4 pt-5 pr-12">
          <DialogTitle>{pick(item, "name", lang)}</DialogTitle>
          <DialogDescription id="combo-step-label" className="mt-0.5">
            {t("step")} {stepIndex + 1} {t("of")} {steps.length}
          </DialogDescription>
          <ol className="mt-3 flex gap-2">
            {steps.map((s, i) => {
              const done = isComplete(s) && (picks[s.step_number]?.length ?? 0) > 0;
              const reachable = i <= stepIndex || steps.slice(0, i).every(isComplete);
              return (
                <li key={s.step_number} className="flex-1">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => setStepIndex(i)}
                    aria-current={i === stepIndex ? "step" : undefined}
                    className="w-full text-left disabled:cursor-not-allowed"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-colors duration-300",
                        i === stepIndex ? "bg-primary" : done ? "bg-success" : "bg-muted",
                      )}
                    />
                    <span
                      className={cn(
                        "mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold",
                        i === stepIndex ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {done && <Check className="size-3 shrink-0 text-success" strokeWidth={3} />}
                      {i + 1}. {pick(s, "step_title", lang)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Options */}
        {step && (
          <div key={step.step_number} className="flex-1 animate-pop overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 id={`step-${step.step_number}`} className="text-lg font-extrabold">{pick(step, "step_title", lang)}</h3>
              <span className={cn("shrink-0 text-xs font-bold", step.is_required ? "text-primary" : "text-muted-foreground")}>
                {step.is_required ? t("required") : t("optional")}
                {step.max_select > 1 && ` · ${t("pickUpTo")} ${step.max_select}`}
              </span>
            </div>
            <div role={single ? "radiogroup" : "group"} aria-labelledby={`step-${step.step_number}`} className="grid gap-2">
              {step.options.map((o) => {
                const selected = current.includes(o.id);
                const blocked = !selected && !single && current.length >= step.max_select;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={single ? "radio" : "checkbox"}
                    aria-checked={selected}
                    disabled={blocked}
                    onClick={() => choose(o.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]",
                      selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40",
                      blocked && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                        single ? "rounded-full" : "rounded-md",
                        selected ? "border-primary bg-primary text-white" : "border-muted-foreground/40",
                      )}
                    >
                      {selected && (single ? <span className="size-2 rounded-full bg-white" /> : <Check className="size-3" strokeWidth={4} />)}
                    </span>
                    <span className="flex-1 font-semibold">{pick(o, "name", lang)}</span>
                    <span className={cn("text-sm font-semibold", o.additional_price > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {o.additional_price > 0 ? `+${formatINR(o.additional_price)}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
            {step.is_required && current.length === 0 && (
              <p className="mt-3 text-xs font-medium text-muted-foreground">{t("selectToContinue")}</p>
            )}
          </div>
        )}

        {/* Price + actions */}
        <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-end justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="block text-sm font-semibold text-foreground">{t("itemTotal")}</span>
              {formatINR(item.price)}
              {addOns.map((o) => (
                <span key={o.id}> + {formatINR(o.additional_price)} ({pick(o, "name", lang)})</span>
              ))}
            </div>
            <span key={unitPrice} className="animate-bump text-2xl font-black text-primary" aria-live="polite">
              {formatINR(unitPrice)}
            </span>
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="lg" className="px-3" onClick={() => setStepIndex((i) => i - 1)} aria-label={t("back")}>
                <ChevronLeft />
              </Button>
            )}
            {isLast ? (
              <Button size="lg" className="flex-1" disabled={!allComplete} onClick={submit}>
                <ShoppingBag /> {t("addToCart")}
              </Button>
            ) : (
              <Button size="lg" className="flex-1" disabled={!step || !isComplete(step)} onClick={() => setStepIndex((i) => i + 1)}>
                {t("next")} <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
