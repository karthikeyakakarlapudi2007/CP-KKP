"use client";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api, ApiError, type MenuItemInput } from "@/lib/api";
import { checkImageUrl, checkPrice, checkTelugu, checkText, collect, type FieldErrors } from "@/lib/menuValidation";
import type { Category, MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "@/store/useToastStore";
import { ComboConfigEditor, fromDraftSteps, newStep, toDraftSteps, validateSteps, type DraftStep } from "./ComboConfigEditor";

type Draft = {
  category_id: string;
  name_en: string;
  name_te: string;
  description_en: string;
  description_te: string;
  price: string;
  image_url: string;
  is_available: boolean;
  is_combo: boolean;
  steps: DraftStep[];
};

type Props = {
  /** null = closed; { item: null } = create; { item } = edit */
  state: { item: MenuItem | null; categoryId?: number } | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (item: MenuItem, mode: "created" | "updated") => void;
};

const toDraft = (item: MenuItem | null, categoryId: number | undefined): Draft => ({
  category_id: String(item?.category_id ?? categoryId ?? ""),
  name_en: item?.name_en ?? "",
  name_te: item?.name_te ?? "",
  description_en: item?.description_en ?? "",
  description_te: item?.description_te ?? "",
  price: item ? String(item.price) : "",
  image_url: item?.image_url ?? "",
  is_available: item?.is_available ?? true,
  is_combo: item?.is_combo ?? false,
  steps: item?.is_combo ? toDraftSteps(item.combo_steps) : [],
});

function validate(d: Draft, categories: Category[]): FieldErrors {
  const errors = collect([
    ["category_id", categories.some((c) => String(c.id) === d.category_id) ? null : "Choose a category"],
    ["name_en", checkText(d.name_en, "English name", 120)],
    ["name_te", checkTelugu(d.name_te, "Telugu name")],
    ["description_en", d.description_en.length > 500 ? "Keep it under 500 characters" : null],
    ["description_te", d.description_te.length > 500 ? "Keep it under 500 characters" : null],
    ["price", checkPrice(d.price, { allowZero: d.is_combo, label: d.is_combo ? "Base price" : "Price" })],
    ["image_url", checkImageUrl(d.image_url)],
  ]);
  return d.is_combo ? { ...errors, ...validateSteps(d.steps) } : errors;
}

/** Map a server zod error onto our field keys (fallback when client checks miss something). */
function serverFieldErrors(err: ApiError): FieldErrors {
  const d = err.details as { fieldErrors?: Record<string, string[]>; field?: string } | undefined;
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(d?.fieldErrors ?? {})) out[k === "combo_steps" ? "steps" : k] = v[0] ?? "Invalid";
  if (d?.field) out[d.field] = err.message;
  return out;
}

function FieldError({ msg, id }: { msg?: string; id: string }) {
  return msg ? <p id={id} className="mt-1 text-xs font-medium text-destructive">{msg}</p> : null;
}

export function MenuItemModal({ state, categories, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(null, undefined));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgState, setImgState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const bodyRef = useRef<HTMLDivElement>(null);
  const editing = state?.item ?? null;

  // Reset only when the modal is (re)opened — NOT when categories refresh from a live
  // menu:updated broadcast, which would wipe a half-typed form.
  useEffect(() => {
    if (!state) return;
    setDraft(toDraft(state.item, state.categoryId ?? categories[0]?.id));
    setErrors({});
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    setImgState(draft.image_url.trim() && !checkImageUrl(draft.image_url) ? "loading" : "idle");
  }, [draft.image_url]);

  // live re-validation once the user has tried to save
  useEffect(() => {
    if (touched) setErrors(validate(draft, categories));
  }, [draft, touched, categories]);

  if (!state) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const fieldCls = (k: string) => cn(errors[k] && "border-destructive focus-visible:ring-destructive");
  const describedBy = (k: string) => (errors[k] ? `${k}-error` : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const found = validate(draft, categories);
    setErrors(found);
    const count = Object.keys(found).length;
    if (count) {
      toast.error(`Please fix ${count} field${count === 1 ? "" : "s"} before saving`);
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    const body: MenuItemInput = {
      category_id: Number(draft.category_id),
      name_en: draft.name_en.trim(),
      name_te: draft.name_te.trim(),
      description_en: draft.description_en.trim() || null,
      description_te: draft.description_te.trim() || null,
      price: Number(draft.price),
      image_url: draft.image_url.trim() || null,
      is_available: draft.is_available,
      is_combo: draft.is_combo,
      combo_steps: draft.is_combo ? fromDraftSteps(draft.steps) : [],
    };
    setSaving(true);
    try {
      const saved = editing ? await api.updateItem(editing.id, body) : await api.createItem(body);
      onSaved(saved, editing ? "updated" : "created");
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = serverFieldErrors(err);
        if (Object.keys(fe).length) setErrors(fe);
        toast.error(editing ? "Couldn't save changes" : "Couldn't add the dish", err.message);
      } else toast.error("Couldn't reach the server — check the connection and try again");
    } finally {
      setSaving(false);
    }
  };

  const aria = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": describedBy(k) });

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl" aria-describedby="item-modal-desc">
        <form onSubmit={submit} noValidate className="flex max-h-[90dvh] flex-col">
          <div className="border-b p-5 pr-12">
            <DialogTitle>{editing ? `Edit dish · ${editing.name_en}` : "Add New Dish"}</DialogTitle>
            <DialogDescription id="item-modal-desc">Changes go live on every guest phone as soon as you save.</DialogDescription>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="grid gap-5 md:grid-cols-[1fr_11rem]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select id="category_id" className={fieldCls("category_id")} {...aria("category_id")} value={draft.category_id} onChange={(e) => set("category_id", e.target.value)}>
                    <option value="" disabled>Choose a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_en} / {c.name_te}</option>
                    ))}
                  </Select>
                  <FieldError id="category_id-error" msg={errors.category_id} />
                </div>
                <div>
                  <Label htmlFor="name_en">Dish name (English)</Label>
                  <Input id="name_en" className={fieldCls("name_en")} {...aria("name_en")} value={draft.name_en} onChange={(e) => set("name_en", e.target.value)} placeholder="Gongura Mutton Biryani" />
                  <FieldError id="name_en-error" msg={errors.name_en} />
                </div>
                <div>
                  <Label htmlFor="name_te">Dish name (Telugu)</Label>
                  <Input id="name_te" lang="te" className={fieldCls("name_te")} {...aria("name_te")} value={draft.name_te} onChange={(e) => set("name_te", e.target.value)} placeholder="గోంగూర మటన్ బిర్యానీ" />
                  <FieldError id="name_te-error" msg={errors.name_te} />
                </div>
                <div>
                  <Label htmlFor="description_en">Description (English) <span className="font-normal text-muted-foreground">· optional</span></Label>
                  <Textarea id="description_en" className={cn("min-h-20", fieldCls("description_en"))} {...aria("description_en")} value={draft.description_en} onChange={(e) => set("description_en", e.target.value)} placeholder="Tender mutton dum-cooked with gongura leaves" />
                  <FieldError id="description_en-error" msg={errors.description_en} />
                </div>
                <div>
                  <Label htmlFor="description_te">Description (Telugu) <span className="font-normal text-muted-foreground">· optional</span></Label>
                  <Textarea id="description_te" lang="te" className={cn("min-h-20", fieldCls("description_te"))} {...aria("description_te")} value={draft.description_te} onChange={(e) => set("description_te", e.target.value)} placeholder="గోంగూర ఆకులతో దమ్ చేసిన మటన్" />
                  <FieldError id="description_te-error" msg={errors.description_te} />
                </div>
                <div>
                  <Label htmlFor="price">{draft.is_combo ? "Base price (₹)" : "Price (₹)"}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <Input
                      id="price"
                      inputMode="decimal"
                      autoComplete="off"
                      className={cn("pl-7 tabular-nums", fieldCls("price"))}
                      {...aria("price")}
                      value={draft.price}
                      onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="249"
                    />
                  </div>
                  <FieldError id="price-error" msg={errors.price} />
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL <span className="font-normal text-muted-foreground">· optional</span></Label>
                  <Input id="image_url" type="url" className={fieldCls("image_url")} {...aria("image_url")} value={draft.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…/dish.jpg" />
                  <FieldError id="image_url-error" msg={errors.image_url} />
                </div>
              </div>

              {/* live image preview */}
              <div>
                <span className="text-sm font-medium">Preview</span>
                <div className="mt-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-muted text-center text-xs text-muted-foreground" data-testid="image-preview" data-state={imgState}>
                  {draft.image_url.trim() && !checkImageUrl(draft.image_url) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={draft.image_url}
                        src={draft.image_url.trim()}
                        alt="Dish preview"
                        className={cn("size-full object-cover", imgState !== "ok" && "hidden")}
                        onLoad={() => setImgState("ok")}
                        onError={() => setImgState("error")}
                      />
                      {imgState === "loading" && <Spinner className="size-6" />}
                      {imgState === "error" && (
                        <span className="flex flex-col items-center gap-1 p-2 text-amber-700"><ImageOff className="size-6" /> Couldn&apos;t load this image. Guests will see a placeholder.</span>
                      )}
                    </>
                  ) : (
                    <span className="flex flex-col items-center gap-1 p-2"><span className="text-3xl">🍛</span> Paste an image URL to preview</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl bg-muted/50 px-4 py-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={draft.is_available} onCheckedChange={(v) => set("is_available", v)} aria-label="In stock" />
                <span className={draft.is_available ? "text-success" : "text-destructive"}>{draft.is_available ? "In stock" : "Out of stock"}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={draft.is_combo}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setDraft((d) => ({ ...d, is_combo: v, steps: v && d.steps.length === 0 ? [newStep()] : d.steps }));
                  }}
                />
                <Layers className="size-4 text-primary" /> This is a combo (guests build it step by step)
              </label>
            </div>

            {draft.is_combo && (
              <ComboConfigEditor steps={draft.steps} onChange={(steps) => set("steps", steps)} errors={errors} basePrice={Number(draft.price) || 0} />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t p-4">
            {Object.keys(errors).length > 0 && (
              <p className="mr-auto text-sm font-medium text-destructive">{Object.keys(errors).length} field(s) need attention</p>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner className="size-4 text-white" />} {editing ? "Save changes" : "Add dish"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
