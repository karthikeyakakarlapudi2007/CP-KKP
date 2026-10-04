"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, SelectedStep } from "@/lib/types";

export type CartLine = {
  /** menu item id + selections, so identical builds merge */
  key: string;
  menu_item_id: number;
  name_en: string;
  name_te: string;
  unit_price: number;
  quantity: number;
  combo_selections?: Record<string, string[]>;
  selected_steps?: SelectedStep[];
};

type CartState = {
  tableId: number | null;
  lines: CartLine[];
  notes: string;
  bindTable: (tableId: number) => void;
  add: (item: MenuItem, opts?: { selections?: Record<string, string[]>; steps?: SelectedStep[]; unitPrice?: number }) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  remove: (key: string) => void;
  removeItems: (menuItemIds: number[]) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
};

const lineKey = (id: number, sel?: Record<string, string[]>) =>
  sel
    ? `${id}|${Object.keys(sel)
        .sort()
        .map((k) => `${k}:${[...(sel[k] ?? [])].sort().join(",")}`)
        .join(";")}`
    : String(id);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      tableId: null,
      lines: [],
      notes: "",
      bindTable: (tableId) => {
        if (get().tableId !== tableId) set({ tableId, lines: [], notes: "" });
      },
      add: (item, opts) => {
        const key = lineKey(item.id, opts?.selections);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              key,
              menu_item_id: item.id,
              name_en: item.name_en,
              name_te: item.name_te,
              unit_price: opts?.unitPrice ?? item.price,
              quantity: 1,
              combo_selections: opts?.selections,
              selected_steps: opts?.steps,
            },
          ],
        });
      },
      increment: (key) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) }),
      decrement: (key) =>
        set({
          lines: get()
            .lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
            .filter((l) => l.quantity > 0),
        }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      removeItems: (ids) => set({ lines: get().lines.filter((l) => !ids.includes(l.menu_item_id)) }),
      setNotes: (notes) => set({ notes }),
      clear: () => set({ lines: [], notes: "" }),
    }),
    { name: "kp-cart" },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unit_price * l.quantity, 0);
