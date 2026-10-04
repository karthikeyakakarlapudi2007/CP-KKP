"use client";
import { ArrowDown, ArrowUp, Eye, Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkPrice, checkTelugu, checkText, collect, type FieldErrors } from "@/lib/menuValidation";
import type { ComboStep } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

/** Editable shape: prices stay strings while typing so "12." doesn't get mangled. */
export type DraftOption = { id: string; name_en: string; name_te: string; extra: string };
export type DraftStep = { key: string; title_en: string; title_te: string; is_required: boolean; max_select: number; options: DraftOption[] };

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const newOption = (): DraftOption => ({ id: uid("opt"), name_en: "", name_te: "", extra: "" });
export const newStep = (): DraftStep => ({ key: uid("step"), title_en: "", title_te: "", is_required: true, max_select: 1, options: [newOption()] });

export function toDraftSteps(steps: ComboStep[]): DraftStep[] {
  return [...steps]
    .sort((a, b) => a.step_number - b.step_number)
    .map((s) => ({
      key: uid("step"),
      title_en: s.step_title_en,
      title_te: s.step_title_te,
      is_required: s.is_required,
      max_select: s.max_select,
      // keep option ids: carts / past orders reference them
      options: s.options.map((o) => ({ id: o.id, name_en: o.name_en, name_te: o.name_te, extra: o.additional_price ? String(o.additional_price) : "" })),
    }));
}

/** Steps are renumbered 1..n in display order when saved. */
export function fromDraftSteps(steps: DraftStep[]): Omit<ComboStep, "id">[] {
  return steps.map((s, i) => ({
    step_number: i + 1,
    step_title_en: s.title_en.trim(),
    step_title_te: s.title_te.trim(),
    is_required: s.is_required,
    max_select: Math.min(Math.max(1, s.max_select), s.options.length),
    options: s.options.map((o) => ({
      id: o.id,
      name_en: o.name_en.trim(),
      name_te: o.name_te.trim(),
      additional_price: o.extra.trim() ? Number(o.extra) : 0,
    })),
  }));
}

/** Field keys: steps.{i}.title_en, steps.{i}.options.{j}.name_te … */
export function validateSteps(steps: DraftStep[]): FieldErrors {
  if (steps.length === 0) return { steps: "A combo needs at least one step" };
  const entries: [string, string | null][] = [];
  steps.forEach((s, i) => {
    entries.push([`steps.${i}.title_en`, checkText(s.title_en, "Step title (English)", 120)]);
    entries.push([`steps.${i}.title_te`, checkTelugu(s.title_te, "Step title (Telugu)")]);
    if (s.options.length === 0) entries.push([`steps.${i}.options`, "Add at least one option"]);
    const seen = new Set<string>();
    s.options.forEach((o, j) => {
      entries.push([`steps.${i}.options.${j}.name_en`, checkText(o.name_en, "Option name", 120)]);
      entries.push([`steps.${i}.options.${j}.name_te`, o.name_te.trim() ? null : "Telugu name is required"]);
      entries.push([`steps.${i}.options.${j}.extra`, o.extra.trim() ? checkPrice(o.extra, { allowZero: true, label: "Extra price" }) : null]);
      const key = o.name_en.trim().toLowerCase();
      if (key && seen.has(key)) entries.push([`steps.${i}.options.${j}.name_en`, "Duplicate option in this step"]);
      seen.add(key);
    });
  });
  return collect(entries);
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs font-medium text-destructive">{msg}</p> : null;
}

type Props = { steps: DraftStep[]; onChange: (steps: DraftStep[]) => void; errors: FieldErrors; basePrice: number };

export function ComboConfigEditor({ steps, onChange, errors, basePrice }: Props) {
  const update = (i: number, patch: Partial<DraftStep>) => onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const updateOpt = (i: number, j: number, patch: Partial<DraftOption>) =>
    update(i, { options: steps[i]!.options.map((o, k) => (k === j ? { ...o, ...patch } : o)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...steps];
    const [s] = next.splice(i, 1);
    next.splice(i + dir, 0, s!);
    onChange(next);
  };
  const err = (k: string) => errors[k];
  const inputCls = (k: string) => cn("h-9", err(k) && "border-destructive focus-visible:ring-destructive");
  const inv = (k: string) => ({ "aria-invalid": Boolean(err(k)) });

  return (
    <section aria-label="Combo builder steps" className="space-y-3 rounded-xl border-2 border-dashed border-accent bg-accent/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold"><Layers className="size-4 text-primary" /> Combo builder steps</h3>
          <p className="text-xs text-muted-foreground">Guests pick from these step by step on their phone. Extra prices add to the base price.</p>
        </div>
        <Button type="button" size="sm" onClick={() => onChange([...steps, newStep()])}>
          <Plus /> Add Step
        </Button>
      </div>
      <FieldError msg={err("steps")} />

      {steps.map((s, i) => (
        <fieldset key={s.key} className="rounded-xl border bg-card p-4 shadow-sm" aria-label={`Step ${i + 1}`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">{i + 1}</span>
            <legend className="font-bold">Step {i + 1}</legend>
            <div className="ml-auto flex gap-1">
              <Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move step ${i + 1} up`}><ArrowUp /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label={`Move step ${i + 1} down`}><ArrowDown /></Button>
              <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => onChange(steps.filter((_, k) => k !== i))} aria-label={`Remove step ${i + 1}`}><Trash2 /></Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={`${s.key}-en`}>Step title (English)</label>
              <Input id={`${s.key}-en`} className={inputCls(`steps.${i}.title_en`)} {...inv(`steps.${i}.title_en`)} placeholder="Select Base" value={s.title_en} onChange={(e) => update(i, { title_en: e.target.value })} />
              <FieldError msg={err(`steps.${i}.title_en`)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={`${s.key}-te`}>Step title (Telugu)</label>
              <Input id={`${s.key}-te`} lang="te" className={inputCls(`steps.${i}.title_te`)} {...inv(`steps.${i}.title_te`)} placeholder="బేస్ ఎంచుకోండి" value={s.title_te} onChange={(e) => update(i, { title_te: e.target.value })} />
              <FieldError msg={err(`steps.${i}.title_te`)} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={s.is_required} onChange={(e) => update(i, { is_required: e.target.checked })} />
              Mandatory step
            </label>
            <label className="flex items-center gap-2">
              Guests pick up to
              <select
                className="h-8 rounded-md border bg-card px-2"
                value={Math.min(s.max_select, Math.max(1, s.options.length))}
                onChange={(e) => update(i, { max_select: Number(e.target.value) })}
              >
                {Array.from({ length: Math.max(1, s.options.length) }, (_, k) => k + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-[1fr_1fr_6.5rem_2rem] gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Option (English)</span><span>Option (Telugu)</span><span>Extra ₹</span><span className="sr-only">Remove</span>
            </div>
            <div className="mt-1 space-y-2">
              {s.options.map((o, j) => {
                const k = `steps.${i}.options.${j}`;
                return (
                  <div key={o.id}>
                    <div className="grid grid-cols-[1fr_1fr_6.5rem_2rem] items-start gap-2">
                      <Input aria-label={`Step ${i + 1} option ${j + 1} name (English)`} className={inputCls(`${k}.name_en`)} {...inv(`${k}.name_en`)} placeholder="Bagara Rice" value={o.name_en} onChange={(e) => updateOpt(i, j, { name_en: e.target.value })} />
                      <Input aria-label={`Step ${i + 1} option ${j + 1} name (Telugu)`} lang="te" className={inputCls(`${k}.name_te`)} {...inv(`${k}.name_te`)} placeholder="బగారా రైస్" value={o.name_te} onChange={(e) => updateOpt(i, j, { name_te: e.target.value })} />
                      <Input aria-label={`Step ${i + 1} option ${j + 1} extra price`} inputMode="decimal" className={inputCls(`${k}.extra`)} {...inv(`${k}.extra`)} placeholder="0" value={o.extra} onChange={(e) => updateOpt(i, j, { extra: e.target.value })} />
                      <Button type="button" size="icon" variant="ghost" className="size-9" disabled={s.options.length === 1} onClick={() => update(i, { options: s.options.filter((_, x) => x !== j) })} aria-label={`Remove option ${j + 1}`}>
                        <Trash2 />
                      </Button>
                    </div>
                    <FieldError msg={err(`${k}.name_en`) ?? err(`${k}.name_te`) ?? err(`${k}.extra`)} />
                  </div>
                );
              })}
            </div>
            <FieldError msg={err(`steps.${i}.options`)} />
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => update(i, { options: [...s.options, newOption()] })}>
              <Plus /> Add option
            </Button>
          </div>
        </fieldset>
      ))}

      {steps.length > 0 && (
        <div className="rounded-xl bg-card p-3 text-xs">
          <p className="mb-2 flex items-center gap-1 font-bold text-muted-foreground"><Eye className="size-3.5" /> What guests will see</p>
          <ol className="space-y-1.5">
            {steps.map((s, i) => (
              <li key={s.key}>
                <span className="font-semibold">{i + 1}. {s.title_en || "Untitled step"}</span>
                <span className="text-muted-foreground"> · {s.is_required ? "required" : "optional"}{s.max_select > 1 ? `, up to ${s.max_select}` : ""}: </span>
                {s.options.map((o) => `${o.name_en || "…"}${Number(o.extra) > 0 ? ` (+${formatINR(Number(o.extra))})` : ""}`).join(" · ")}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-muted-foreground">Starts at {formatINR(basePrice || 0)}</p>
        </div>
      )}
    </section>
  );
}
