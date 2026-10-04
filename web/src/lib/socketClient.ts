"use client";
import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { EVENTS } from "./events";

/**
 * One Socket.IO connection per browser tab, shared by every screen.
 * Rooms joined through `joinRoom` are remembered and re-joined automatically after a reconnect.
 */
export type JoinPayload = { role: "customer"; table: number } | { role: "admin" | "kds"; staffKey?: string };

type AckResponse<T> = { ok: true; data: T } | { ok: false; status: number; error: string; details?: unknown };

export class CommandError extends Error {
  constructor(
    /** 0 = never reached the server (offline); -1 = sent but no reply in time */
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

let socket: Socket | null = null;
let connectionState: ConnectionState = "connecting";
const stateListeners = new Set<() => void>();

function setConnectionState(next: ConnectionState) {
  if (next === connectionState) return;
  connectionState = next;
  stateListeners.forEach((l) => l());
}

export const getConnectionState = () => connectionState;

/** React hook: live connection state of the shared socket. */
export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(
    (cb) => {
      getSocket();
      stateListeners.add(cb);
      return () => stateListeners.delete(cb);
    },
    getConnectionState,
    () => "connecting",
  );
}
/** room payload → number of mounted users (several components may share one room) */
const joined = new Map<string, { payload: JoinPayload; refs: number }>();

export function getSocket(): Socket {
  if (!socket) {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      randomizationFactor: 0.4,
      timeout: 8000,
    });
    socket = s;

    s.on("connect", () => {
      setConnectionState("connected");
      // (re)join every room this tab cares about — covers server restarts and long outages
      joined.forEach(({ payload }) => s.emit(EVENTS.JOIN, payload));
    });
    s.on("disconnect", (reason) => {
      // "io client disconnect" = we closed it on purpose; anything else will auto-retry
      setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting");
      // the server kicked us (e.g. deploy): socket.io won't retry on its own in this case
      if (reason === "io server disconnect") s.connect();
    });
    s.on("connect_error", () => setConnectionState(s.active ? "reconnecting" : "disconnected"));
    s.io.on("reconnect_attempt", () => setConnectionState("reconnecting"));
    s.io.on("reconnect_failed", () => setConnectionState("disconnected"));

    if (typeof window !== "undefined") {
      // phones: radio off / cell handoff / tab frozen in the background
      window.addEventListener("offline", () => setConnectionState("disconnected"));
      const kick = () => {
        if (!s.connected) {
          setConnectionState("reconnecting");
          s.connect();
        }
      };
      window.addEventListener("online", kick);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") kick();
      });
    }
  }
  return socket;
}

/** Join a room for as long as the caller needs it; returns the matching leave function. */
export function joinRoom(payload: JoinPayload): () => void {
  const key = JSON.stringify(payload);
  const s = getSocket();
  const entry = joined.get(key);
  if (entry) {
    entry.refs += 1;
  } else {
    joined.set(key, { payload, refs: 1 });
    if (s.connected) s.emit(EVENTS.JOIN, payload);
  }
  let left = false;
  return () => {
    if (left) return;
    left = true;
    const current = joined.get(key);
    if (!current) return;
    current.refs -= 1;
    if (current.refs > 0) return;
    joined.delete(key);
    if (s.connected) s.emit(EVENTS.LEAVE, payload);
  };
}

/**
 * Send a command and wait for the server's acknowledgement.
 * Rejects with CommandError(0) when offline so callers can safely fall back to REST,
 * and with CommandError(-1) on timeout (the server may have processed it — don't blindly retry).
 */
export async function sendCommand<T>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
  const s = getSocket();
  if (!s.connected) throw new CommandError(0, "Not connected");
  let res: AckResponse<T>;
  try {
    res = (await s.timeout(timeoutMs).emitWithAck(event, payload)) as AckResponse<T>;
  } catch {
    throw new CommandError(-1, "No response from server");
  }
  if (!res.ok) throw new CommandError(res.status, res.error, res.details);
  return res.data;
}
