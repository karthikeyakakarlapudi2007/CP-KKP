import { Router } from "express";
import { prisma } from "../db";
import { ah } from "../lib/http";
import { num, serializeOrder } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";
import { requestBill, resolveTable, settleTable } from "../services/actions";
import { ACTIVE_STATUSES } from "../services/orders";

export const tablesRouter = Router();

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

/** Public: "Request Bill" — same action as the `table:request_bill` socket command. */
tablesRouter.post(
  "/tables/:ref/request-bill",
  ah(async (req, res) => {
    res.json(await requestBill(String(req.params.ref)));
  }),
);

/** Staff: the cashier settles every open order on a table at once. */
tablesRouter.post(
  "/tables/:ref/settle",
  requireStaff,
  ah(async (req, res) => {
    res.json(await settleTable(String(req.params.ref)));
  }),
);
