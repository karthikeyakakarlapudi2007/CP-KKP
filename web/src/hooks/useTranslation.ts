"use client";
import { useCallback } from "react";
import { translate, type TranslationKey } from "@/lib/translations";
import { useCustomerStore } from "@/store/useCustomerStore";

/** `const { t, lang } = useTranslation(); t("placeOrder")` — re-renders instantly on language toggle. */
export function useTranslation() {
  const lang = useCustomerStore((s) => s.language);
  const t = useCallback((key: TranslationKey) => translate(key, lang), [lang]);
  return { t, lang };
}
