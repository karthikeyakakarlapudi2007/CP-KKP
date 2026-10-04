"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/config";
import { EVENTS } from "@/lib/events";

type JoinPayload = { role: "customer"; table: number } | { role: "admin" | "kds"; staffKey?: string };
type Handlers = Record<string, (payload: any) => void>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Connects to the realtime gateway, joins the role's room (re-joining after every reconnect)
 * and dispatches events to the latest handlers without re-subscribing on each render.
 * `onReconnect` lets screens refetch state they may have missed while offline.
 */
export function useSocket(join: JoinPayload | null, handlers: Handlers, onReconnect?: () => void) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  const reconnectRef = useRef(onReconnect);
  handlersRef.current = handlers;
  reconnectRef.current = onReconnect;
  const joinKey = join ? JSON.stringify(join) : null;

  useEffect(() => {
    if (!joinKey) return;
    const payload = JSON.parse(joinKey) as JoinPayload;
    const socket: Socket = io(API_URL, { transports: ["websocket", "polling"], reconnectionDelayMax: 5000 });
    let firstConnect = true;

    socket.on("connect", () => {
      socket.emit(EVENTS.JOIN, payload, () => undefined);
      setConnected(true);
      if (!firstConnect) reconnectRef.current?.();
      firstConnect = false;
    });
    socket.on("disconnect", () => setConnected(false));
    socket.onAny((event: string, data: unknown) => handlersRef.current[event]?.(data));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [joinKey]);

  return { connected };
}
