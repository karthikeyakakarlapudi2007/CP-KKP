import type { Server } from "socket.io";
import { EVENTS, ROOMS } from "./events";

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

/** Typed broadcast helpers — called only after the DB transaction has committed. */
export const broadcast = {
  /** New ticket → merchant dashboard + kitchen (+ the table's other phones) */
  orderCreated(order: { table_number: number }) {
    io?.to([ROOMS.admin, ROOMS.kds, ROOMS.table(order.table_number)]).emit(EVENTS.ORDER_CREATED, order);
  },
  /** Status progression → the guest's table + kitchen (+ dashboard so its kanban moves) */
  orderStatusChanged(order: { table_number: number }) {
    io?.to([ROOMS.table(order.table_number), ROOMS.kds, ROOMS.admin]).emit(EVENTS.ORDER_STATUS_CHANGED, order);
  },
  /** Stock toggle → every connected client */
  availabilityToggled(payload: { menu_item_id: number; is_available: boolean }) {
    io?.emit(EVENTS.MENU_AVAILABILITY_TOGGLED, payload);
  },
  menuUpdated() {
    io?.emit(EVENTS.MENU_UPDATED, { at: Date.now() });
  },
  /** Bill request → dashboard alert (+ the table, to confirm on every phone there) */
  billRequested(payload: { table_number: number; amount_due: number; order_ids: string[] }) {
    io?.to([ROOMS.admin, ROOMS.table(payload.table_number)]).emit(EVENTS.TABLE_BILL_REQUESTED, payload);
  },
  /** Table status change (occupied / bill_requested / vacant) → dashboard, kitchen and the table */
  tableUpdated(payload: { id: number; status: string }) {
    io?.to([ROOMS.admin, ROOMS.kds, ROOMS.table(payload.id)]).emit(EVENTS.TABLE_STATUS_UPDATED, payload);
  },
};
