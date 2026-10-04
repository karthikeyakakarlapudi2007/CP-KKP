import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { EVENTS, ROOMS } from "./events";
import { HttpError } from "./lib/http";
import {
  createOrderSchema,
  socketJoinSchema,
  socketRequestBillSchema,
  socketToggleSchema,
  socketUpdateStatusSchema,
} from "./lib/schemas";
import { isValidStaffKey } from "./middleware/staffAuth";
import { setIo } from "./realtime";
import { createOrder, requestBill, toggleAvailability, updateOrderStatus } from "./services/actions";

export type Ack<T = unknown> = (
  res: { ok: true; data: T } | { ok: false; status: number; error: string; details?: unknown },
) => void;

type StaffRole = "admin" | "kds";
type SocketData = { staffRoles: Set<StaffRole>; orderTimes: number[] };
type GatewaySocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

/** Same budget as the REST order limiter: 20 orders per minute per connection. */
const ORDER_LIMIT = 20;
const ORDER_WINDOW_MS = 60_000;

function toAckError(err: unknown) {
  if (err instanceof HttpError) return { ok: false as const, status: err.status, error: err.message, details: err.details };
  if (err instanceof ZodError) return { ok: false as const, status: 400, error: "Validation failed", details: err.flatten() };
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return { ok: false as const, status: 404, error: "Record not found" };
  }
  console.error("[socket]", err);
  return { ok: false as const, status: 500, error: "Internal server error" };
}

/**
 * Registers a command handler that always answers through the ack callback
 * (when the client supplied one) and never throws into Socket.IO.
 */
function command<T>(
  socket: GatewaySocket,
  event: string,
  handler: (payload: unknown, socket: GatewaySocket) => Promise<T>,
) {
  socket.on(event as never, (async (payload: unknown, ack?: Ack<T>) => {
    const reply: Ack<T> = typeof ack === "function" ? ack : () => undefined;
    try {
      reply({ ok: true, data: await handler(payload, socket) });
    } catch (err) {
      reply(toAckError(err));
    }
  }) as never);
}

function requireStaffSocket(socket: GatewaySocket, roles: StaffRole[]) {
  if (!roles.some((r) => socket.data.staffRoles.has(r))) {
    throw new HttpError(401, `Join as ${roles.join(" or ")} first`);
  }
}

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: env.corsOrigins, methods: ["GET", "POST"] },
    pingInterval: 10_000,
    pingTimeout: 8_000,
    maxHttpBufferSize: 100_000,
  });
  setIo(io);

  io.on("connection", (raw) => {
    const socket = raw as unknown as GatewaySocket;
    socket.data.orderTimes = [];
    socket.data.staffRoles = new Set();

    /** join → rooms: `table:<n>` for guests, `admin` / `kds` for staff (staff key checked). */
    command(socket, EVENTS.JOIN, async (payload) => {
      const join = socketJoinSchema.parse(payload);
      if (join.role === "customer") {
        const exists = await prisma.restaurantTable.findUnique({ where: { id: join.table }, select: { id: true } });
        if (!exists) throw new HttpError(404, "unknown table");
        await socket.join(ROOMS.table(join.table));
        return { room: ROOMS.table(join.table) };
      }
      if (!isValidStaffKey(join.staffKey)) throw new HttpError(401, "unauthorized");
      socket.data.staffRoles.add(join.role);
      await socket.join(join.role === "admin" ? ROOMS.admin : ROOMS.kds);
      return { room: join.role };
    });

    /** leave → drop a room (e.g. the same browser tab moves to another table). */
    command(socket, EVENTS.LEAVE, async (payload) => {
      const join = socketJoinSchema.parse(payload);
      if (join.role === "customer") {
        await socket.leave(ROOMS.table(join.table));
        return { room: ROOMS.table(join.table) };
      }
      await socket.leave(join.role);
      socket.data.staffRoles.delete(join.role);
      return { room: join.role };
    });

    /** order:create → DB → `order:created` to admin + kds (and the table room). Public. */
    command(socket, EVENTS.ORDER_CREATE, async (payload) => {
      const now = Date.now();
      socket.data.orderTimes = socket.data.orderTimes.filter((t) => now - t < ORDER_WINDOW_MS);
      if (socket.data.orderTimes.length >= ORDER_LIMIT) {
        throw new HttpError(429, "Too many orders from this device, please wait a moment");
      }
      socket.data.orderTimes.push(now);
      return createOrder(createOrderSchema.parse(payload));
    });

    /** order:update_status → DB → `order:status_changed` to `table:<n>` + kds (and admin). Staff only. */
    command(socket, EVENTS.ORDER_UPDATE_STATUS, async (payload) => {
      requireStaffSocket(socket, ["admin", "kds"]);
      const { order_id, status } = socketUpdateStatusSchema.parse(payload);
      return updateOrderStatus(order_id, status);
    });

    /** menu:toggle_availability → DB → `menu:availability_toggled` to everyone. Admin only. */
    command(socket, EVENTS.MENU_TOGGLE_AVAILABILITY, async (payload) => {
      requireStaffSocket(socket, ["admin"]);
      const { menu_item_id, is_available } = socketToggleSchema.parse(payload);
      return toggleAvailability(menu_item_id, is_available);
    });

    /** table:request_bill → table `bill_requested` → `table:bill_requested` to admin. Public. */
    command(socket, EVENTS.TABLE_REQUEST_BILL, async (payload) => {
      const { table_number } = socketRequestBillSchema.parse(payload);
      return requestBill(table_number);
    });
  });

  return io;
}
