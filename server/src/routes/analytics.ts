import { Router } from "express";
import { prisma } from "../db";
import { env } from "../env";
import { ah } from "../lib/http";
import { num } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";

export const analyticsRouter = Router();

/** Start of "today" (minus `daysBack` days) in the restaurant's local timezone, as UTC Date. */
function localDayStart(daysBack = 0): Date {
  const offsetMs = env.tzOffsetMinutes * 60_000;
  const local = new Date(Date.now() + offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - daysBack);
  return new Date(local.getTime() - offsetMs);
}

/** KPIs: revenue / fulfilled orders / avg ticket over paid orders, plus top sellers. ?range=today|7d|30d&top=5 */
analyticsRouter.get(
  "/analytics/summary",
  requireStaff,
  ah(async (req, res) => {
    const range = req.query.range === "7d" ? 6 : req.query.range === "30d" ? 29 : 0;
    const since = localDayStart(range);
    const top = Math.min(Math.max(Number(req.query.top) || 10, 1), 50);

    const [paid, topDishes, openOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "paid", created_at: { gte: since } },
        _sum: { total_amount: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ menu_item_id: number; name: string; qty: bigint; revenue: string }[]>`
        SELECT oi.menu_item_id,
               MAX(oi.item_name_snapshot) AS name,
               SUM(oi.quantity)            AS qty,
               SUM(oi.quantity * oi.unit_price)::text AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'cancelled' AND o.created_at >= ${since}
        GROUP BY oi.menu_item_id
        ORDER BY qty DESC, revenue DESC
        LIMIT ${top}`,
      prisma.order.count({ where: { status: { in: ["pending", "preparing", "served"] } } }),
    ]);

    const revenue = num(paid._sum.total_amount ?? 0);
    const fulfilled = paid._count._all;
    res.json({
      range: req.query.range ?? "today",
      since: since.toISOString(),
      revenue,
      fulfilled_orders: fulfilled,
      average_ticket: fulfilled ? Math.round((revenue / fulfilled) * 100) / 100 : 0,
      open_orders: openOrders,
      top_dishes: topDishes.map((t) => ({
        menu_item_id: t.menu_item_id,
        name: t.name,
        quantity: Number(t.qty),
        revenue: Number(t.revenue),
      })),
    });
  }),
);
