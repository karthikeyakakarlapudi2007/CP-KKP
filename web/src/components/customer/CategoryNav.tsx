"use client";
import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import type { Category } from "@/lib/types";
import { cn, pick } from "@/lib/utils";

type Props = {
  categories: Category[];
  activeId: number | null;
  onSelect: (id: number) => void;
  query: string;
  onQueryChange: (q: string) => void;
};

/** Sticky sub-header: search + horizontally scrolling category tabs that follow the scroll position. */
export function CategoryNav({ categories, activeId, onSelect, query, onQueryChange }: Props) {
  const { t, lang } = useTranslation();
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());

  // keep the highlighted tab visible inside the horizontal strip
  useEffect(() => {
    if (activeId == null) return;
    tabRefs.current.get(activeId)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="border-b bg-background/95 backdrop-blur">
      <div className="relative px-4 pt-1">
        <Search className="pointer-events-none absolute left-7 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-10 rounded-full bg-muted/60 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button onClick={() => onQueryChange("")} className="absolute right-7 top-1/2 mt-0.5 -translate-y-1/2" aria-label={t("clearSearch")}>
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-4 py-2.5" aria-label="Categories">
        {categories.map((c) => (
          <button
            key={c.id}
            ref={(el) => {
              if (el) tabRefs.current.set(c.id, el);
              else tabRefs.current.delete(c.id);
            }}
            onClick={() => onSelect(c.id)}
            aria-current={activeId === c.id ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-200",
              activeId === c.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground/80",
            )}
          >
            {pick(c, "name", lang)}
          </button>
        ))}
      </nav>
    </div>
  );
}
