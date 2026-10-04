"use client";
import { Languages } from "lucide-react";
import { useLang } from "@/stores/lang";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={cn("flex items-center rounded-full border bg-card p-0.5 text-xs font-bold shadow-sm", className)} role="group" aria-label="Language">
      <Languages className="mx-1.5 size-3.5 text-muted-foreground" />
      {(["en", "te"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn("rounded-full px-3 py-1.5 transition", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
        >
          {l === "en" ? "English" : "తెలుగు"}
        </button>
      ))}
    </div>
  );
}
