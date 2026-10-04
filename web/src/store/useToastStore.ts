"use client";
import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; kind: ToastKind; title: string; description?: string };

type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

let seq = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.kind === "error" ? 7000 : 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** `toast.success("Saved")`, `toast.error("Couldn't save", err)` — usable outside React too. */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ kind: "success", title, description }),
  info: (title: string, description?: string) => useToastStore.getState().push({ kind: "info", title, description }),
  error: (title: string, err?: unknown) =>
    useToastStore.getState().push({
      kind: "error",
      title,
      description: err instanceof Error ? err.message : typeof err === "string" ? err : undefined,
    }),
};
