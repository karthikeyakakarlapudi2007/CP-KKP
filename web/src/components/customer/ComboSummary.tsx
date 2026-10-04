import type { Lang, SelectedStep } from "@/lib/types";
import { pick } from "@/lib/utils";

/** Compact "Base: Bagara Rice · Curry: Natu Kodi" breakdown for carts and order tracking. */
export function ComboSummary({ steps, lang, className }: { steps?: SelectedStep[] | null; lang: Lang; className?: string }) {
  if (!steps?.length) return null;
  return (
    <ul className={className ?? "mt-0.5 space-y-0.5 text-xs text-muted-foreground"}>
      {steps.map((s) => (
        <li key={s.step_number}>
          <span className="font-medium">{pick(s, "step_title", lang)}:</span> {s.options.map((o) => pick(o, "name", lang)).join(", ")}
        </li>
      ))}
    </ul>
  );
}
