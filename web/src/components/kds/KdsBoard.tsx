"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/useNow";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { playSound, unlockAudio } from "@/lib/chime";
import { EVENTS } from "@/lib/events";
import { errorMessage, updateOrderStatus } from "@/lib/staffActions";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { KdsTicket, urgencyOf } from "./KdsTicket";

const KITCHEN = new Set(["pending", "preparing"]);
const GLOW_MS = 5000;

export function KdsBoard() {
  const staffKey = useStaffStore((s) => s.key);
  const soundOn = useStaffStore((s) => s.soundOn);
  const setSoundOn = useStaffStore((s) => s.setSoundOn);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const glowTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const now = useNow(5_000);

  const load = useCallback(async () => {
    try {
      setOrders((await api.orders("active")).filter((o) => KITCHEN.has(o.status)));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load tickets"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timers = glowTimers.current;
    return () => timers.forEach(clearTimeout);
  }, [load]);

  /** Newest first in state (prepend); the grid re-sorts strictly by urgency. */
  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const rest = prev.filter((p) => p.id !== o.id);
      return KITCHEN.has(o.status) ? [o, ...rest] : rest; // served / paid / cancelled leave the kitchen
    });
  }, []);

  const glow = useCallback((id: string) => {
    setFresh((s) => new Set(s).add(id));
    clearTimeout(glowTimers.current.get(id));
    glowTimers.current.set(
      id,
      setTimeout(() => {
        setFresh((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        glowTimers.current.delete(id);
      }, GLOW_MS),
    );
  }, []);

  const { connected } = useSocket(
    { role: "kds", staffKey },
    {
      [EVENTS.ORDER_CREATED]: (o: Order) => {
        upsert(o);
        glow(o.id);
        if (useStaffStore.getState().soundOn) void playSound("kitchenBell");
      },
      /** Round 2+ for a table already eating: same flow, flagged ticket */
      [EVENTS.ORDER_ADDON_CREATED]: (o: Order) => {
        upsert(o);
        glow(o.id);
        if (useStaffStore.getState().soundOn) void playSound("kitchenBell");
      },
      [EVENTS.ORDER_STATUS_CHANGED]: upsert,
    },
    load,
  );

  // Oldest unserved ticket first — the most urgent food is always top-left
  const sorted = useMemo(() => [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at)), [orders]);

  const advance = useCallback(
    async (o: Order, next: "preparing" | "served") => {
      setBusy((b) => new Set(b).add(o.id));
      try {
        upsert(await updateOrderStatus(o.id, next));
      } catch (e) {
        setError(errorMessage(e, "Update failed"));
        void load();
      } finally {
        setBusy((b) => {
          const n = new Set(b);
          n.delete(o.id);
          return n;
        });
      }
    },
    [upsert, load],
  );

  const toggleSound = async () => {
    if (soundOn) return setSoundOn(false);
    await unlockAudio();
    setSoundOn(true);
  };

  const waiting = orders.filter((o) => o.status === "pending").length;
  const addons = orders.filter((o) => (o.round ?? 1) > 1).length;
  const cooking = orders.length - waiting;
  const late = orders.filter((o) => urgencyOf(o.created_at, now) === "late").length;

  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black tracking-tight">KITCHEN · కిచెన్</h1>
          <span className="text-lg font-bold tabular-nums text-slate-400">
            {new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="rounded-lg bg-slate-800 px-3 py-1.5">NEW {waiting}</span>
          <span className="rounded-lg bg-sky-950 px-3 py-1.5 text-sky-300">COOKING {cooking}</span>
          {addons > 0 && <span className="rounded-lg bg-violet-950 px-3 py-1.5 text-violet-300">ADD-ONS {addons}</span>}
          {late > 0 && <span className="animate-pulse rounded-lg bg-red-600 px-3 py-1.5">LATE {late}</span>}
          <span className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5", connected ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300")}>
            {connected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />} {connected ? "LIVE" : "OFFLINE"}
          </span>
          <button
            onClick={toggleSound}
            className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5", soundOn ? "bg-slate-800" : "animate-pulse bg-amber-500 text-slate-950")}
          >
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} {soundOn ? "BELL ON" : "TAP TO ENABLE BELL"}
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
            className="rounded-lg bg-slate-800 p-2"
            aria-label="Fullscreen"
          >
            <Maximize className="size-4" />
          </button>
        </div>
      </header>

      {error && (
        <button onClick={() => setError(null)} className="block w-full bg-red-900 px-4 py-2 text-center font-bold">
          {error} — tap to dismiss
        </button>
      )}

      {loading ? (
        <div className="flex h-[70dvh] items-center justify-center">
          <Spinner className="size-12 text-white" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex h-[70dvh] flex-col items-center justify-center gap-2 text-slate-500">
          <p className="text-3xl font-black">All caught up 🎉</p>
          <p className="text-lg">New orders appear here instantly.</p>
        </div>
      ) : (
        <main className="grid grid-cols-1 items-start gap-4 p-4 md:grid-cols-3 xl:grid-cols-4">
          {sorted.map((o) => (
            <KdsTicket key={o.id} order={o} now={now} isNew={fresh.has(o.id)} busy={busy.has(o.id)} onAdvance={advance} />
          ))}
        </main>
      )}
    </div>
  );
}
