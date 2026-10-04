"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang, MenuItem, Order, SelectedStep, TableStatus } from "@/lib/types";

export type CartItem = {
  /** line id: menu item + chosen options, so identical builds merge */
  id: string;
  menuItemId: number;
  name: { en: string; te: string };
  quantity: number;
  unitPrice: number;
  selectedComboOptions: SelectedStep[] | null;
  specialNotes: string;
};

export type ActiveOrderStatus = "pending" | "preparing" | "served";

export type ActiveOrder = {
  id: string;
  status: ActiveOrderStatus;
  billRequested: boolean;
};

const OPEN: ReadonlySet<string> = new Set(["pending", "preparing", "served"]);
const MAX_QTY = 50;

type CustomerState = {
  tableNumber: number | null;
  language: Lang;
  cart: CartItem[];
  /** order-level "Special Instructions / వంట సూచనలు" */
  orderNotes: string;
  /** latest open order for this table — drives the live tracker */
  activeOrder: ActiveOrder | null;
  /** every open (unpaid) order on the table — summary + amount due */
  tableOrders: Order[];

  setTableNumber: (n: number) => void;
  setLanguage: (l: Lang) => void;
  toggleLanguage: () => void;

  addToCart: (item: MenuItem, combo?: { steps: SelectedStep[]; unitPrice: number }) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  setItemNotes: (id: string, notes: string) => void;
  removeMenuItems: (menuItemIds: number[]) => number;
  setOrderNotes: (notes: string) => void;
  clearCart: () => void;

  /** replace with the server's view of the table (initial load / reconnect) */
  syncTable: (orders: Order[], tableStatus: TableStatus) => void;
  /** apply an order:created / order:status_changed payload; returns the order's previous status */
  applyOrder: (order: Order) => Order["status"] | null;
  setBillRequested: (v: boolean) => void;
};

const lineId = (menuItemId: number, steps?: SelectedStep[] | null) =>
  steps?.length
    ? `${menuItemId}|${[...steps]
        .sort((a, b) => a.step_number - b.step_number)
        .map((s) => `${s.step_number}:${s.options.map((o) => o.id).sort().join(",")}`)
        .join(";")}`
    : String(menuItemId);

function deriveActive(orders: Order[], billRequested: boolean): ActiveOrder | null {
  const latest = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest ? { id: latest.id, status: latest.status as ActiveOrderStatus, billRequested } : null;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      tableNumber: null,
      language: "en",
      cart: [],
      orderNotes: "",
      activeOrder: null,
      tableOrders: [],

      setTableNumber: (n) => {
        // a cart belongs to one table — scanning another table's QR starts fresh
        if (get().tableNumber !== n) set({ tableNumber: n, cart: [], orderNotes: "", activeOrder: null, tableOrders: [] });
      },
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === "en" ? "te" : "en" }),

      addToCart: (item, combo) => {
        const steps = combo?.steps ?? null;
        const id = lineId(item.id, steps);
        const existing = get().cart.find((l) => l.id === id);
        if (existing) {
          set({ cart: get().cart.map((l) => (l.id === id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + 1) } : l)) });
          return;
        }
        set({
          cart: [
            ...get().cart,
            {
              id,
              menuItemId: item.id,
              name: { en: item.name_en, te: item.name_te },
              quantity: 1,
              unitPrice: combo?.unitPrice ?? item.price,
              selectedComboOptions: steps,
              specialNotes: "",
            },
          ],
        });
      },
      incrementItem: (id) =>
        set({ cart: get().cart.map((l) => (l.id === id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + 1) } : l)) }),
      decrementItem: (id) =>
        set({
          cart: get()
            .cart.map((l) => (l.id === id ? { ...l, quantity: l.quantity - 1 } : l))
            .filter((l) => l.quantity > 0),
        }),
      removeItem: (id) => set({ cart: get().cart.filter((l) => l.id !== id) }),
      setItemNotes: (id, notes) => set({ cart: get().cart.map((l) => (l.id === id ? { ...l, specialNotes: notes.slice(0, 200) } : l)) }),
      removeMenuItems: (ids) => {
        const before = get().cart.length;
        const cart = get().cart.filter((l) => !ids.includes(l.menuItemId));
        set({ cart });
        return before - cart.length;
      },
      setOrderNotes: (orderNotes) => set({ orderNotes: orderNotes.slice(0, 500) }),
      clearCart: () => set({ cart: [], orderNotes: "" }),

      syncTable: (orders, tableStatus) => {
        const open = orders.filter((o) => OPEN.has(o.status));
        const billRequested = tableStatus === "bill_requested" || open.some((o) => o.bill_requested);
        set({ tableOrders: open, activeOrder: deriveActive(open, billRequested) });
      },
      applyOrder: (order) => {
        const prev = get().tableOrders.find((o) => o.id === order.id) ?? null;
        const rest = get().tableOrders.filter((o) => o.id !== order.id);
        const tableOrders = OPEN.has(order.status) ? [...rest, order] : rest;
        const billRequested = tableOrders.length > 0 && (get().activeOrder?.billRequested || order.bill_requested);
        set({ tableOrders, activeOrder: deriveActive(tableOrders, billRequested) });
        return prev?.status ?? null;
      },
      setBillRequested: (v) => {
        const a = get().activeOrder;
        if (a) set({ activeOrder: { ...a, billRequested: v } });
      },
    }),
    {
      name: "kp-customer",
      storage: createJSONStorage(() => localStorage),
      // live order state always comes from the server; only preferences + cart persist
      partialize: (s) => ({ language: s.language, tableNumber: s.tableNumber, cart: s.cart, orderNotes: s.orderNotes }),
      version: 1,
    },
  ),
);

export const cartCount = (cart: CartItem[]) => cart.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (cart: CartItem[]) => cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

/** cart line → `combo_selections` payload expected by order:create */
export const toComboSelections = (steps: SelectedStep[] | null) =>
  steps?.length ? Object.fromEntries(steps.map((s) => [String(s.step_number), s.options.map((o) => o.id)])) : undefined;
