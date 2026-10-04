"use client";
import { api } from "./api";
import { EVENTS } from "./events";
import { CommandError, sendCommand } from "./socketClient";
import type { Order } from "./types";

/**
 * Staff mutations go over the shared socket (`order:update_status`, `menu:toggle_availability`)
 * and fall back to REST only when the socket is offline — both paths run the same server action
 * and broadcast the same events.
 */
async function socketFirst<T>(event: string, payload: unknown, rest: () => Promise<T>): Promise<T> {
  try {
    return await sendCommand<T>(event, payload);
  } catch (e) {
    if (e instanceof CommandError && e.status === 0) return rest();
    throw e;
  }
}

export type StaffStatus = "preparing" | "served" | "paid" | "cancelled";

export const updateOrderStatus = (orderId: string, status: StaffStatus) =>
  socketFirst<Order>(EVENTS.ORDER_UPDATE_STATUS, { order_id: orderId, status }, () => api.setOrderStatus(orderId, status));

export const toggleAvailability = (menuItemId: number, isAvailable: boolean) =>
  socketFirst<{ menu_item_id: number; is_available: boolean }>(
    EVENTS.MENU_TOGGLE_AVAILABILITY,
    { menu_item_id: menuItemId, is_available: isAvailable },
    async () => {
      const r = await api.toggleAvailability(menuItemId, isAvailable);
      return { menu_item_id: r.id, is_available: r.is_available };
    },
  );

export function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}
