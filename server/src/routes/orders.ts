import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../db";
import { ah, HttpError } from "../lib/http";
import { createOrderSchema, statusUpdateSchema } from "../lib/schemas";
import { serializeOrder } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";
import { ACTIVE_STATUSES, assertTransition, buildOrder } from "../services/orders";
import { broadcast } from "../socket";

export const ordersRouter = Router();

const placeOrderLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many orders from this device, please wait a moment" },
});

/** Public: guest places an order from /t/[tableId]. */
ordersRouter.post(
  "/orders",
  placeOrderLimiter,
  ah(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const { table, lines, total } = await buildOrder(input);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          table_number: table.id,
          total_amount: total,
          customer_notes: input.customer_notes,
          items: { create: lines },
        },
        include: { items: true },
      });
      if (table.status === "vacant") {
        await tx.restaurantTable.update({ where: { id: table.id }, data: { status: "occupied" } });
      }
      return created;
    });

    const payload = serializeOrder(order);
    broadcast.orderCreated(payload);
    if (table.status === "vacant") broadcast.tableUpdated({ id: table.id, status: "occupied" });
    res.status(201).json(payload);
  }),
);

/** Staff: list orders. ?scope=active (default) | history  &limit= */
ordersRouter.get(
  "/orders",
  requireStaff,
  ah(async (req, res) => {
    const scope = req.query.scope === "history" ? "history" : "active";
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const statuses: OrderStatus[] = scope === "active" ? ACTIVE_STATUSES : ["paid", "cancelled"];
    const orders = await prisma.order.findMany({
      where: { status: { in: statuses } },
      orderBy: { created_at: scope === "active" ? "asc" : "desc" },
      take: limit,
      include: { items: { orderBy: { id: "asc" } } },
    });
    res.json(orders.map(serializeOrder));
  }),
);

/** Staff: advance an order (Start Preparing / Mark Served / Mark as Paid / Cancel). */
ordersRouter.patch(
  "/orders/:id/status",
  requireStaff,
  ah(async (req, res) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Invalid order id");
    const { status } = statusUpdateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Order not found");
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
      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: { orderBy: { id: "asc" } } },
      });
      return { order, tableStatus };
    });

    const payload = serializeOrder(result.order);
    broadcast.orderStatusChanged(payload);
    if (result.tableStatus) broadcast.tableUpdated({ id: payload.table_number, status: result.tableStatus });
    res.json(payload);
  }),
);
