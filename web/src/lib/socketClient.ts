"use client";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./config";
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

let socket: Socket | null = null;
const joined = new Map<string, JoinPayload>();

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 5000,
    });
    socket.on("connect", () => {
      joined.forEach((payload) => socket!.emit(EVENTS.JOIN, payload));
    });
  }
  return socket;
}

/** Join a room for as long as the caller needs it; returns the matching leave function. */
export function joinRoom(payload: JoinPayload): () => void {
  const key = JSON.stringify(payload);
  const s = getSocket();
  joined.set(key, payload);
  if (s.connected) s.emit(EVENTS.JOIN, payload);
  return () => {
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
