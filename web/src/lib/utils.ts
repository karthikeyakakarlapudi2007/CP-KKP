import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lang } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n);

/** Pick the localized field: pick(item, "name", "te") -> item.name_te (falls back to English). */
export function pick<T extends object, K extends string>(obj: T, field: K, lang: Lang): string {
  const rec = obj as Record<string, unknown>;
  const v = rec[`${field}_${lang}`] ?? rec[`${field}_en`];
  return typeof v === "string" ? v : "";
}

/** Snapshots are stored as "English / తెలుగు". */
export function splitSnapshot(snapshot: string, lang: Lang): string {
  const [en, te] = snapshot.split(" / ");
  return (lang === "te" ? te : en) || snapshot;
}

export function minutesSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}
