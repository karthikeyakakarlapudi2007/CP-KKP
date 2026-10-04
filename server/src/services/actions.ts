/**
 * The four realtime commands (and table settlement) as transport-agnostic actions.
 * Both the REST routes and the Socket.IO gateway call these, so validation, persistence
 * and broadcasting behave identically whichever channel a client uses.
 */
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../lib/http";
import type { CreateOrderInput } from "../lib/schemas";
import { num, serializeOrder } from "../lib/serialize";
import { broadcast } from "../realtime";
import { ACTIVE_STATUSES, assertTransition, buildOrder } from "./orders";

/** Accepts a table number ("7") or its QR token. */
export async function resolveTable(ref: string | number) {
  const n = Number(ref);
  const table =
    Number.isInteger(n) && n > 0
      ? await prisma.restaurantTable.findUnique({ where: { id: n } })
      : await prisma.restaurantTable.findUnique({ where: { qr_code_token: String(ref) } });
  if (!table) throw new HttpError(404, "Table not found");
  return table;
}

/**
 * Serialise every write that touches one table's tickets (two phones ordering at once,
 * a cashier settling while a guest adds Round 2…) with a row lock on the table.
 */
async function lockTable(tx: Prisma.TransactionClient, tableId: number) {
  const rows = await tx.$queryRaw<{ status: string }[]>`
    SELECT status::text AS status FROM restaurant_tables WHERE id = ${tableId} FOR UPDATE`;
  if (!rows[0]) throw new HttpError(404, "Table not found");
  return rows[0].status as "vacant" | "occupied" | "bill_requested";
}

/**
 * order:create — price server-side and persist. If the table already has open tickets this
 * becomes a linked add-on round (Round 2, 3…) instead of touching the earlier tickets.
 */
export async function createOrder(input: CreateOrderInput) {
  const { table, lines, total } = await buildOrder(input);

  const { order, previousStatus } = await prisma.$transaction(async (tx) => {
    const previousStatus = await lockTable(tx, table.id);
    const open = await tx.order.aggregate({
      where: { table_number: table.id, status: { in: ACTIVE_STATUSES } },
      _max: { round: true },
      _count: { _all: true },
    });
    const round = open._count._all > 0 ? (open._max.round ?? 1) + 1 : 1;

    const created = await tx.order.create({
      data: {
        table_number: table.id,
        total_amount: total,
        customer_notes: input.customer_notes,
        round,
        items: { create: lines },
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (previousStatus !== "occupied") {
      // a new round after "Request Bill" re-opens the bill: staff must not print an incomplete one
      await tx.restaurantTable.update({ where: { id: table.id }, data: { status: "occupied" } });
      if (previousStatus === "bill_requested") {
        await tx.order.updateMany({
          where: { table_number: table.id, status: { in: ACTIVE_STATUSES } },
          data: { bill_requested: false },
        });
      }
    }
    return { order: created, previousStatus };
  });

  const payload = serializeOrder(order);
  if (payload.round > 1) broadcast.orderAddonCreated(payload);
  else broadcast.orderCreated(payload);
  if (previousStatus !== "occupied") broadcast.tableUpdated({ id: table.id, status: "occupied" });
  return payload;
}

/** order:update_status — validated transition; paying/cancelling the last open order frees the table. */
export async function updateOrderStatus(id: string, status: Exclude<OrderStatus, "pending">) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invalid order id");

  const result = await prisma.$transaction(async (tx) => {
    const found = await tx.order.findUnique({ where: { id }, select: { table_number: true } });
    if (!found) throw new HttpError(404, "Order not found");
    await lockTable(tx, found.table_number);
    const current = await tx.order.findUniqueOrThrow({ where: { id } });
    assertTransition(current.status, status);

    // Optimistic guard against two staff screens racing on the same ticket
    const changed = await tx.order.updateMany({
      where: { id, status: current.status },
      data: { status, ...(status === "paid" ? { bill_requested: false } : {}) },
    });
    if (changed.count === 0) throw new HttpError(409, "Order was updated elsewhere, refresh");

    let tableStatus: string | null = null;
    if (status === "paid" || status === "cancelled") {
      const remaining = await tx.order.count({
        where: { table_number: current.table_number, status: { in: ACTIVE_STATUSES } },
      });
      if (remaining === 0) {
        await tx.restaurantTable.update({ where: { id: current.table_number }, data: { status: "vacant" } });
        tableStatus = "vacant";
      }
    }
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: { orderBy: { id: "asc" } } } });
    return { order, tableStatus };
  });

  const payload = serializeOrder(result.order);
  broadcast.orderStatusChanged(payload);
  if (result.tableStatus) broadcast.tableUpdated({ id: payload.table_number, status: result.tableStatus });
  return payload;
}

/** menu:toggle_availability — flips stock for one dish on every connected screen. */
export async function toggleAvailability(menuItemId: number, isAvailable: boolean) {
  const item = await prisma.menuItem.update({ where: { id: menuItemId }, data: { is_available: isAvailable } });
  const payload = { menu_item_id: item.id, is_available: item.is_available };
  broadcast.availabilityToggled(payload);
  return payload;
}

/** table:request_bill — flags the table and its open orders so a server comes to collect payment. */
export async function requestBill(tableRef: string | number) {
  const t = await resolveTable(tableRef);
  const result = await prisma.$transaction(async (tx) => {
    await lockTable(tx, t.id);
    const active = await tx.order.findMany({
      where: { table_number: t.id, status: { in: ACTIVE_STATUSES } },
      select: { id: true, total_amount: true },
    });
    if (active.length === 0) throw new HttpError(409, "No open orders on this table");
    await tx.order.updateMany({ where: { id: { in: active.map((o) => o.id) } }, data: { bill_requested: true } });
    await tx.restaurantTable.update({ where: { id: t.id }, data: { status: "bill_requested" } });
    return {
      table_number: t.id,
      order_ids: active.map((o) => o.id),
      amount_due: active.reduce((s, o) => s + num(o.total_amount), 0),
    };
  });
  broadcast.billRequested(result);
  broadcast.tableUpdated({ id: t.id, status: "bill_requested" });
  return result;
}

/** Cashier settles every open order on a table at once. */
export async function settleTable(tableRef: string | number) {
  const t = await resolveTable(tableRef);
  const ids = await prisma.$transaction(async (tx) => {
    await lockTable(tx, t.id);
    const active = await tx.order.findMany({
      where: { table_number: t.id, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
    });
    await tx.order.updateMany({
      where: { id: { in: active.map((o) => o.id) } },
      data: { status: "paid", bill_requested: false },
    });
    await tx.restaurantTable.update({ where: { id: t.id }, data: { status: "vacant" } });
    return active.map((o) => o.id);
  });
  const orders = await prisma.order.findMany({ where: { id: { in: ids } }, include: { items: { orderBy: { id: "asc" } } } });
  orders.forEach((o) => broadcast.orderStatusChanged(serializeOrder(o)));
  broadcast.tableUpdated({ id: t.id, status: "vacant" });
  return { settled_order_ids: ids };
}
