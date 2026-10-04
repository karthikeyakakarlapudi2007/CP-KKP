"use client";
import { useCustomerStore } from "@/store/useCustomerStore";
import { cn } from "@/lib/utils";

/** EN | తె pill — flips every label, dish name and button instantly. */
export function LangToggle({ className }: { className?: string }) {
  const language = useCustomerStore((s) => s.language);
  const setLanguage = useCustomerStore((s) => s.setLanguage);
  return (
    <div role="group" aria-label="Language / భాష" className={cn("relative flex rounded-full bg-muted p-1 text-sm font-bold", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow transition-transform duration-300",
          language === "te" && "translate-x-full",
        )}
      />
      {(
        [
          { id: "en", label: "EN", full: "English" },
          { id: "te", label: "తె", full: "తెలుగు" },
        ] as const
      ).map((l) => (
        <button
          key={l.id}
          onClick={() => setLanguage(l.id)}
          aria-pressed={language === l.id}
          aria-label={l.full}
          className={cn(
            "relative z-10 min-w-11 rounded-full px-3 py-1.5 transition-colors",
            language === l.id ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
