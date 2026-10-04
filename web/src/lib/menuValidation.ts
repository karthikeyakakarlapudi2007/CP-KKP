/** Client-side checks mirroring the server's zod rules, so staff get field-level errors instantly. */

export const TELUGU_RE = /[ఀ-౿]/;
const PRICE_RE = /^\d{1,6}(\.\d{1,2})?$/;
const MAX_PRICE = 100000;

export type FieldErrors = Record<string, string>;

export function checkPrice(raw: string, { allowZero = false, label = "Price" } = {}): string | null {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  if (!PRICE_RE.test(v)) return `${label} must be a number like 249 or 249.50`;
  const n = Number(v);
  if (n > MAX_PRICE) return `${label} can't exceed ₹${MAX_PRICE.toLocaleString("en-IN")}`;
  if (!allowZero && n <= 0) return `${label} must be more than ₹0`;
  return null;
}

export function checkTelugu(raw: string, label: string): string | null {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  if (!TELUGU_RE.test(v)) return `${label} must be written in Telugu script (తెలుగు)`;
  return null;
}

export function checkText(raw: string, label: string, max: number): string | null {
  const v = raw.trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} is too long (max ${max} characters)`;
  return null;
}

export function checkImageUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Image URL must start with http:// or https://";
  } catch {
    return "That doesn't look like a valid URL";
  }
  return null;
}

/** Collect non-null messages into a FieldErrors map. */
export function collect(entries: [string, string | null][]): FieldErrors {
  return Object.fromEntries(entries.filter((e): e is [string, string] => e[1] !== null));
}
