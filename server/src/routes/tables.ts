import { Router } from "express";
import { prisma } from "../db";
import { ah, HttpError } from "../lib/http";
import { num, serializeOrder } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";
import { ACTIVE_STATUSES } from "../services/orders";
import { broadcast } from "../socket";

export const tablesRouter = Router();

/** Accepts a table number ("7") or its QR token. */
async function resolveTable(ref: string) {
  const n = Number(ref);
  const table = Number.isInteger(n) && n > 0
    ? await prisma.restaurantTable.findUnique({ where: { id: n } })
    : await prisma.restaurantTable.findUnique({ where: { qr_code_token: ref } });
  if (!table) throw new HttpError(404, "Table not found");
  return table;
}

/** Staff: floor overview with outstanding amount per table. */
tablesRouter.get(
  "/tables",
  requireStaff,
  ah(async (_req, res) => {
    const [tables, dues] = await Promise.all([
      prisma.restaurantTable.findMany({ orderBy: { id: "asc" } }),
      prisma.order.groupBy({
        by: ["table_number"],
        where: { status: { in: ACTIVE_STATUSES } },
        _sum: { total_amount: true },
        _count: { _all: true },
      }),
    ]);
    const dueMap = new Map(dues.map((d) => [d.table_number, d]));
    res.json(
      tables.map((t) => ({
        id: t.id,
        qr_code_token: t.qr_code_token,
        status: t.status,
        active_orders: dueMap.get(t.id)?._count._all ?? 0,
        amount_due: num(dueMap.get(t.id)?._sum.total_amount ?? 0),
      })),
    );
  }),
);

/** Public: validate a table from the QR link. */
tablesRouter.get(
  "/tables/:ref",
  ah(async (req, res) => {
    const t = await resolveTable(String(req.params.ref));
    res.json({ id: t.id, status: t.status });
  }),
);

/** Public: the table's live (unpaid) orders for the guest tracking screen. */
tablesRouter.get(
  "/tables/:ref/orders",
  ah(async (req, res) => {
    const t = await resolveTable(String(req.params.ref));
    const orders = await prisma.order.findMany({
      where: { table_number: t.id, status: { in: ACTIVE_STATUSES } },
      orderBy: { created_at: "asc" },
      include: { items: { orderBy: { id: "asc" } } },
    });
    res.set("Cache-Control", "no-store");
    res.json({ table: { id: t.id, status: t.status }, orders: orders.map(serializeOrder) });
  }),
);

/** Public: "Request Bill" — flags the table so a server comes to collect payment. */
tablesRouter.post(
  "/tables/:ref/request-bill",
  ah(async (req, res) => {
    const t = await resolveTable(String(req.params.ref));
    const result = await prisma.$transaction(async (tx) => {
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
    res.json(result);
  }),
);

/** Staff: the cashier settles every open order on a table at once. */
tablesRouter.post(
  "/tables/:ref/settle",
  requireStaff,
  ah(async (req, res) => {
    const t = await resolveTable(String(req.params.ref));
    const ids = await prisma.$transaction(async (tx) => {
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
    const orders = await prisma.order.findMany({ where: { id: { in: ids } }, include: { items: true } });
    orders.forEach((o) => broadcast.orderStatusChanged(serializeOrder(o)));
    broadcast.tableUpdated({ id: t.id, status: "vacant" });
    res.json({ settled_order_ids: ids });
  }),
);
