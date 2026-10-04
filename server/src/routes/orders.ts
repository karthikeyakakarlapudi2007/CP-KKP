import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../db";
import { ah } from "../lib/http";
import { createOrderSchema, statusUpdateSchema } from "../lib/schemas";
import { serializeOrder } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";
import { createOrder, updateOrderStatus } from "../services/actions";
import { ACTIVE_STATUSES } from "../services/orders";

export const ordersRouter = Router();

const placeOrderLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many orders from this device, please wait a moment" },
});

/** Public: guest places an order from /t/[tableId] (same action as the `order:create` socket command). */
ordersRouter.post(
  "/orders",
  placeOrderLimiter,
  ah(async (req, res) => {
    res.status(201).json(await createOrder(createOrderSchema.parse(req.body)));
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
    const { status } = statusUpdateSchema.parse(req.body);
    res.json(await updateOrderStatus(String(req.params.id), status));
  }),
);
