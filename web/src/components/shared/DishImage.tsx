"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Merchant-pasted image URL with a graceful placeholder when missing or broken. */
export function DishImage({ src, className }: { src: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <div className={cn("flex items-center justify-center bg-muted text-2xl", className)} aria-hidden>🍛</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={cn("object-cover", className)} />;
}
