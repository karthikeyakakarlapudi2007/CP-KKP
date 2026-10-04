import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./env";
import { EVENTS, ROOMS } from "./events";
import { isValidStaffKey } from "./middleware/staffAuth";
import { prisma } from "./db";

let io: Server | null = null;

type JoinPayload =
  | { role: "customer"; table: number }
  | { role: "admin" | "kds"; staffKey?: string };

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: env.corsOrigins, methods: ["GET", "POST"] },
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });

  io.on("connection", (socket) => {
    socket.on(EVENTS.JOIN, async (payload: JoinPayload, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      try {
        if (payload?.role === "customer") {
          const table = Number(payload.table);
          if (!Number.isInteger(table) || table <= 0) return reply({ ok: false, error: "bad table" });
          const exists = await prisma.restaurantTable.findUnique({ where: { id: table }, select: { id: true } });
          if (!exists) return reply({ ok: false, error: "unknown table" });
          await socket.join(ROOMS.table(table));
          return reply({ ok: true });
        }
        if (payload?.role === "admin" || payload?.role === "kds") {
          if (!isValidStaffKey(payload.staffKey)) return reply({ ok: false, error: "unauthorized" });
          await socket.join(payload.role === "admin" ? ROOMS.admin : ROOMS.kds);
          return reply({ ok: true });
        }
        reply({ ok: false, error: "bad role" });
      } catch (err) {
        console.error("[socket join]", err);
        reply({ ok: false, error: "join failed" });
      }
    });
  });

  return io;
}

/** Typed broadcast helpers — routes call these after a successful DB commit. */
export const broadcast = {
  orderCreated(order: { table_number: number }) {
    io?.to([ROOMS.admin, ROOMS.kds, ROOMS.table(order.table_number)]).emit(EVENTS.ORDER_CREATED, order);
  },
  orderStatusChanged(order: { table_number: number }) {
    io?.to([ROOMS.admin, ROOMS.kds, ROOMS.table(order.table_number)]).emit(EVENTS.ORDER_STATUS_CHANGED, order);
  },
  availabilityToggled(payload: { menu_item_id: number; is_available: boolean }) {
    io?.emit(EVENTS.MENU_AVAILABILITY_TOGGLED, payload); // every connected menu
  },
  menuUpdated() {
    io?.emit(EVENTS.MENU_UPDATED, { at: Date.now() });
  },
  billRequested(payload: { table_number: number; amount_due: number; order_ids: string[] }) {
    io?.to([ROOMS.admin, ROOMS.table(payload.table_number)]).emit(EVENTS.TABLE_BILL_REQUESTED, payload);
  },
  tableUpdated(payload: { id: number; status: string }) {
    io?.to([ROOMS.admin, ROOMS.table(payload.id)]).emit(EVENTS.TABLE_UPDATED, payload);
  },
};
