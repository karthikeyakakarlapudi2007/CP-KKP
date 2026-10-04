"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket, joinRoom, type JoinPayload } from "@/lib/socketClient";

type Handlers = Record<string, (payload: any) => void>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Joins a room on the shared socket for the component's lifetime and routes events to the
 * latest handlers (no re-subscribe per render). `onReconnect` lets screens refetch anything
 * they may have missed while offline.
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
    const socket = getSocket();
    const leave = joinRoom(JSON.parse(joinKey) as JoinPayload);
    const dispatch = (event: string, data: unknown) => handlersRef.current[event]?.(data);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onReconnected = () => reconnectRef.current?.();

    setConnected(socket.connected);
    socket.onAny(dispatch);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect", onReconnected);
    return () => {
      leave();
      socket.offAny(dispatch);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect", onReconnected);
    };
  }, [joinKey]);

  return { connected };
}
