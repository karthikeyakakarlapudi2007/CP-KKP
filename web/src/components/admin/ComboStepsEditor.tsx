"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ComboOption, ComboStep } from "@/lib/types";

export type EditableStep = Omit<ComboStep, "id">;

const newOptionId = () => `opt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const emptyStep = (n: number): EditableStep => ({
  step_number: n,
  step_title_en: "",
  step_title_te: "",
  is_required: true,
  max_select: 1,
  options: [{ id: newOptionId(), name_en: "", name_te: "", additional_price: 0 }],
});

export function ComboStepsEditor({ steps, onChange }: { steps: EditableStep[]; onChange: (s: EditableStep[]) => void }) {
  const update = (i: number, patch: Partial<EditableStep>) => onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const updateOpt = (i: number, j: number, patch: Partial<ComboOption>) =>
    update(i, { options: steps[i]!.options.map((o, k) => (k === j ? { ...o, ...patch } : o)) });
  const renumber = (list: EditableStep[]) => list.map((s, idx) => ({ ...s, step_number: idx + 1 }));

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <fieldset key={i} className="rounded-xl border bg-muted/40 p-3">
          <legend className="px-1 text-sm font-bold">Step {s.step_number}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Title (English) e.g. Select Base" value={s.step_title_en} onChange={(e) => update(i, { step_title_en: e.target.value })} />
            <Input placeholder="శీర్షిక (తెలుగు)" value={s.step_title_te} onChange={(e) => update(i, { step_title_te: e.target.value })} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={s.is_required} onChange={(e) => update(i, { is_required: e.target.checked })} /> Mandatory
            </label>
            <label className="flex items-center gap-2">
              Max picks
              <Input type="number" min={1} max={20} className="h-8 w-16" value={s.max_select} onChange={(e) => update(i, { max_select: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
            <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => onChange(renumber(steps.filter((_, idx) => idx !== i)))}>
              <Trash2 /> Remove step
            </Button>
          </div>
          <div className="mt-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Options (name EN · name TE · extra ₹)</Label>
            {s.options.map((o, j) => (
              <div key={o.id} className="flex gap-1.5">
                <Input className="h-8" placeholder="Bagara Rice" value={o.name_en} onChange={(e) => updateOpt(i, j, { name_en: e.target.value })} />
                <Input className="h-8" placeholder="బగారా రైస్" value={o.name_te} onChange={(e) => updateOpt(i, j, { name_te: e.target.value })} />
                <Input className="h-8 w-24" type="number" min={0} step="0.5" value={o.additional_price} onChange={(e) => updateOpt(i, j, { additional_price: Number(e.target.value) || 0 })} />
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Remove option" disabled={s.options.length === 1} onClick={() => update(i, { options: s.options.filter((_, k) => k !== j) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => update(i, { options: [...s.options, { id: newOptionId(), name_en: "", name_te: "", additional_price: 0 }] })}>
              <Plus /> Option
            </Button>
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...steps, emptyStep(steps.length + 1)])}>
        <Plus /> Add step
      </Button>
    </div>
  );
}
