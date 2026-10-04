import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ah, HttpError, parseIntParam } from "../lib/http";
import { availabilitySchema, categorySchema, menuItemSchema } from "../lib/schemas";
import { serializeMenuItem } from "../lib/serialize";
import { requireStaff } from "../middleware/staffAuth";
import { broadcast } from "../socket";

export const menuRouter = Router();

/** Public: full bilingual menu (categories -> items -> combo steps). */
menuRouter.get(
  "/menu",
  ah(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      include: { items: { orderBy: { id: "asc" }, include: { combo_steps: true } } },
    });
    res.set("Cache-Control", "no-store");
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name_en: c.name_en,
        name_te: c.name_te,
        sort_order: c.sort_order,
        items: c.items.map(serializeMenuItem),
      })),
    });
  }),
);

/* ---------- Categories (staff) ---------- */

menuRouter.post(
  "/categories",
  requireStaff,
  ah(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    broadcast.menuUpdated();
    res.status(201).json(category);
  }),
);

menuRouter.put(
  "/categories/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.update({ where: { id }, data });
    broadcast.menuUpdated();
    res.json(category);
  }),
);

menuRouter.delete(
  "/categories/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const count = await prisma.menuItem.count({ where: { category_id: id } });
    if (count > 0) throw new HttpError(409, "Move or delete the dishes in this category first");
    await prisma.category.delete({ where: { id } });
    broadcast.menuUpdated();
    res.status(204).end();
  }),
);

/* ---------- Menu items (staff) ---------- */

function stepsCreate(steps: ReturnType<typeof menuItemSchema.parse>["combo_steps"]) {
  return (steps ?? []).map((s) => ({
    step_number: s.step_number,
    step_title_en: s.step_title_en,
    step_title_te: s.step_title_te,
    is_required: s.is_required,
    max_select: s.max_select,
    options: s.options as unknown as Prisma.InputJsonValue,
  }));
}

menuRouter.post(
  "/menu-items",
  requireStaff,
  ah(async (req, res) => {
    const { combo_steps, ...data } = menuItemSchema.parse(req.body);
    const item = await prisma.menuItem.create({
      data: { ...data, combo_steps: { create: data.is_combo ? stepsCreate(combo_steps) : [] } },
      include: { combo_steps: true },
    });
    broadcast.menuUpdated();
    res.status(201).json(serializeMenuItem(item));
  }),
);

menuRouter.put(
  "/menu-items/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const { combo_steps, ...data } = menuItemSchema.parse(req.body);
    const item = await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({ where: { id }, data });
      // Replace combo steps only when provided (or when the item stops being a combo)
      if (combo_steps !== undefined || !data.is_combo) {
        await tx.comboConfig.deleteMany({ where: { menu_item_id: id } });
        if (data.is_combo) {
          await tx.comboConfig.createMany({
            data: stepsCreate(combo_steps).map((s) => ({ ...s, menu_item_id: id })),
          });
        }
      }
      return tx.menuItem.findUniqueOrThrow({ where: { id }, include: { combo_steps: true } });
    });
    broadcast.menuUpdated();
    res.json(serializeMenuItem(item));
  }),
);

/** Instant inventory toggle — pushes to every customer phone in real time. */
menuRouter.patch(
  "/menu-items/:id/availability",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const { is_available } = availabilitySchema.parse(req.body);
    const item = await prisma.menuItem.update({ where: { id }, data: { is_available } });
    broadcast.availabilityToggled({ menu_item_id: item.id, is_available: item.is_available });
    res.json({ id: item.id, is_available: item.is_available });
  }),
);

menuRouter.delete(
  "/menu-items/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const used = await prisma.orderItem.count({ where: { menu_item_id: id } });
    if (used > 0) {
      throw new HttpError(409, "This dish has order history — mark it unavailable instead of deleting");
    }
    await prisma.menuItem.delete({ where: { id } });
    broadcast.menuUpdated();
    res.status(204).end();
  }),
);
