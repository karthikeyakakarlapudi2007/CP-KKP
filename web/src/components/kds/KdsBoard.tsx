"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Maximize, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/hooks/useNow";
import { useSocket } from "@/hooks/useSocket";
import { api, ApiError } from "@/lib/api";
import { playChime, unlockAudio } from "@/lib/chime";
import { EVENTS } from "@/lib/events";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStaffStore } from "@/stores/staff";
import { KdsTicket } from "./KdsTicket";

const KITCHEN_STATUSES = new Set(["pending", "preparing"]);

export function KdsBoard() {
  const staffKey = useStaffStore((s) => s.key);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(false);
  const now = useNow(10_000);

  const load = useCallback(async () => {
    try {
      const data = await api.orders("active");
      setOrders(data.filter((o) => KITCHEN_STATUSES.has(o.status)));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const rest = prev.filter((p) => p.id !== o.id);
      return KITCHEN_STATUSES.has(o.status) ? [...rest, o] : rest;
    });
  }, []);

  const { connected } = useSocket(
    { role: "kds", staffKey },
    {
      [EVENTS.ORDER_CREATED]: (o: Order) => {
        upsert(o);
        if (soundOn) void playChime();
      },
      [EVENTS.ORDER_STATUS_CHANGED]: upsert,
    },
    load,
  );

  const sorted = useMemo(() => [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at)), [orders]);

  const advance = async (o: Order) => {
    const next = o.status === "pending" ? "preparing" : "served";
    setBusy((b) => new Set(b).add(o.id));
    try {
      upsert(await api.setOrderStatus(o.id, next));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
      void load();
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(o.id);
        return n;
      });
    }
  };

  const enableSound = async () => {
    if (soundOn) return setSoundOn(false);
    await unlockAudio();
    setSoundOn(true);
  };

  const counts = { pending: orders.filter((o) => o.status === "pending").length, preparing: orders.filter((o) => o.status === "preparing").length };
  const late = orders.filter((o) => now - new Date(o.created_at).getTime() > 15 * 60_000).length;

  return (
    <div className="dark min-h-dvh bg-neutral-950 text-white">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black tracking-tight">KITCHEN · కిచెన్</h1>
          <span className="text-lg font-bold tabular-nums text-neutral-400">
            {new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="rounded-lg bg-neutral-800 px-3 py-1.5">NEW {counts.pending}</span>
          <span className="rounded-lg bg-sky-900 px-3 py-1.5 text-sky-200">COOKING {counts.preparing}</span>
          {late > 0 && <span className="animate-pulse rounded-lg bg-red-600 px-3 py-1.5">LATE {late}</span>}
          <span className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5", connected ? "bg-emerald-900 text-emerald-200" : "bg-red-900 text-red-200")}>
            {connected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />} {connected ? "LIVE" : "OFFLINE"}
          </span>
          <button onClick={enableSound} className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5", soundOn ? "bg-neutral-800" : "animate-pulse bg-amber-500 text-black")}>
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} {soundOn ? "SOUND ON" : "TAP TO ENABLE SOUND"}
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="rounded-lg bg-neutral-800 p-2" aria-label="Fullscreen">
            <Maximize className="size-4" />
          </button>
        </div>
      </header>

      {error && <div className="bg-red-900 px-4 py-2 text-center font-bold">{error}</div>}

      {loading ? (
        <div className="flex h-[70dvh] items-center justify-center"><Spinner className="size-12 text-white" /></div>
      ) : sorted.length === 0 ? (
        <div className="flex h-[70dvh] flex-col items-center justify-center gap-2 text-neutral-500">
          <p className="text-3xl font-black">All caught up 🎉</p>
          <p className="text-lg">New orders will appear here instantly.</p>
        </div>
      ) : (
        <main className="grid grid-cols-1 items-start gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {sorted.map((o) => (
            <KdsTicket key={o.id} order={o} now={now} busy={busy.has(o.id)} onAdvance={() => void advance(o)} />
          ))}
        </main>
      )}
    </div>
  );
}
