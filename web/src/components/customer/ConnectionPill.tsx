"use client";
import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useConnectionState } from "@/lib/socketClient";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

/** Grace period so a normal page-load handshake never flashes the pill */
const SHOW_AFTER_MS = 1200;

/**
 * Floating top pill while the realtime link is down (patchy dining-hall data, cell handoffs).
 * Briefly confirms "Back online" once the socket recovers.
 */
export function ConnectionPill() {
  const { t } = useTranslation();
  const state = useConnectionState();
  const [visible, setVisible] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const wasDown = useRef(false);

  useEffect(() => {
    if (state === "connected") {
      setVisible(false);
      if (wasDown.current) {
        wasDown.current = false;
        setRecovered(true);
        const id = setTimeout(() => setRecovered(false), 2000);
        return () => clearTimeout(id);
      }
      return;
    }
    const id = setTimeout(() => {
      wasDown.current = true;
      setVisible(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [state]);

  if (!visible && !recovered) return null;
  const down = visible && state !== "connected";
  // always bilingual: the guest may have toggled to a language a waiter can't read, and vice versa
  const bilingual = `${translations.connecting.en} / ${translations.connecting.te}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center px-3" role="status" aria-live="polite">
      <div
        data-connection={state}
        className={cn(
          "flex max-w-md animate-pop items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg",
          down ? "border border-amber-300 bg-amber-100 text-amber-900" : "bg-success text-white",
        )}
      >
        {down ? (
          <>
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
            </span>
            <WifiOff className="size-3.5 shrink-0" />
            <span>{bilingual}</span>
          </>
        ) : (
          <>
            <Wifi className="size-3.5" /> {t("backOnline")}
          </>
        )}
      </div>
    </div>
  );
}
