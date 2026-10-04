"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/types";

type LangState = { lang: Lang; setLang: (l: Lang) => void; toggle: () => void };

export const useLang = create<LangState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "te" : "en" }),
    }),
    { name: "kp-lang" },
  ),
);
