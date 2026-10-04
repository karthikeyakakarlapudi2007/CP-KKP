import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ah, HttpError, parseIntParam } from "../lib/http";
import { availabilitySchema, categorySchema, menuItemSchema, reorderSchema } from "../lib/schemas";
import { serializeMenuItem } from "../lib/serialize";
import { isValidStaffKey, requireStaff } from "../middleware/staffAuth";
import { broadcast } from "../realtime";
import { toggleAvailability } from "../services/actions";

export const menuRouter = Router();

/**
 * Full bilingual menu (categories → items → combo steps).
 * Public callers never see archived dishes/categories; staff can pass ?include_archived=1.
 */
menuRouter.get(
  "/menu",
  ah(async (req, res) => {
    const includeArchived = req.query.include_archived === "1";
    if (includeArchived && !isValidStaffKey(req.header("x-staff-key"))) throw new HttpError(401, "Staff key required");
    const live = includeArchived ? {} : { archived_at: null };

    const categories = await prisma.category.findMany({
      where: live,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      include: { items: { where: live, orderBy: { id: "asc" }, include: { combo_steps: true } } },
    });
    res.set("Cache-Control", "no-store");
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name_en: c.name_en,
        name_te: c.name_te,
        sort_order: c.sort_order,
        archived_at: c.archived_at?.toISOString() ?? null,
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

/** Drag/arrow reordering: the given ids get sort_order 10, 20, 30… in one transaction. */
menuRouter.put(
  "/categories/reorder",
  requireStaff,
  ah(async (req, res) => {
    const { ids } = reorderSchema.parse(req.body);
    if (new Set(ids).size !== ids.length) throw new HttpError(400, "Duplicate category ids");
    await prisma.$transaction(
      ids.map((id, index) => prisma.category.update({ where: { id }, data: { sort_order: (index + 1) * 10 } })),
    );
    broadcast.menuUpdated();
    res.json({ ok: true });
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

/**
 * Safe delete: blocked while live dishes use the category. If only archived dishes (with order
 * history) reference it, the category is archived instead so those records stay valid.
 */
menuRouter.delete(
  "/categories/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const [live, archived] = await Promise.all([
      prisma.menuItem.count({ where: { category_id: id, archived_at: null } }),
      prisma.menuItem.count({ where: { category_id: id, archived_at: { not: null } } }),
    ]);
    if (live > 0) {
      throw new HttpError(409, `${live} dish${live === 1 ? " is" : "es are"} still in this category — move or delete ${live === 1 ? "it" : "them"} first`, {
        item_count: live,
      });
    }
    let mode: "deleted" | "archived";
    if (archived > 0) {
      await prisma.category.update({ where: { id }, data: { archived_at: new Date() } });
      mode = "archived";
    } else {
      await prisma.category.delete({ where: { id } });
      mode = "deleted";
    }
    broadcast.menuUpdated();
    res.json({ mode });
  }),
);

/* ---------- Menu items (staff) ---------- */

type ParsedItem = ReturnType<typeof menuItemSchema.parse>;

function stepsCreate(steps: ParsedItem["combo_steps"]) {
  return (steps ?? []).map((s) => ({
    step_number: s.step_number,
    step_title_en: s.step_title_en,
    step_title_te: s.step_title_te,
    is_required: s.is_required,
    max_select: s.max_select,
    options: s.options as unknown as Prisma.InputJsonValue,
  }));
}

async function assertLiveCategory(categoryId: number) {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { archived_at: true } });
  if (!category || category.archived_at) throw new HttpError(400, "Pick an existing category", { field: "category_id" });
}

menuRouter.post(
  "/menu-items",
  requireStaff,
  ah(async (req, res) => {
    const { combo_steps, ...data } = menuItemSchema.parse(req.body);
    await assertLiveCategory(data.category_id);
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
    await assertLiveCategory(data.category_id);
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItem.findUnique({ where: { id }, select: { archived_at: true } });
      if (!existing || existing.archived_at) throw new HttpError(404, "Dish not found (it may have been deleted)");
      await tx.menuItem.update({ where: { id }, data });
      // Replace the combo steps only when provided (or when the dish stops being a combo).
      // Option ids are kept by the editor, so carts holding older selections stay valid.
      if (combo_steps !== undefined || !data.is_combo) {
        await tx.comboConfig.deleteMany({ where: { menu_item_id: id } });
        if (data.is_combo) {
          await tx.comboConfig.createMany({ data: stepsCreate(combo_steps).map((s) => ({ ...s, menu_item_id: id })) });
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
    const result = await toggleAvailability(id, is_available);
    res.json({ id: result.menu_item_id, is_available: result.is_available });
  }),
);

/**
 * Delete a dish. Dishes that appear on past orders are archived (soft-deleted) so order history,
 * receipts and analytics never lose their references; untouched dishes are removed for good.
 */
menuRouter.delete(
  "/menu-items/:id",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const item = await prisma.menuItem.findUnique({ where: { id }, select: { archived_at: true } });
    if (!item || item.archived_at) throw new HttpError(404, "Dish not found");
    const used = await prisma.orderItem.count({ where: { menu_item_id: id } });
    if (used > 0) {
      await prisma.menuItem.update({ where: { id }, data: { archived_at: new Date(), is_available: false } });
    } else {
      await prisma.menuItem.delete({ where: { id } }); // combo steps cascade
    }
    broadcast.menuUpdated();
    res.json({ mode: used > 0 ? "archived" : "deleted", order_lines: used });
  }),
);

/** Bring an archived dish back (out of stock, so staff can review it before guests see it). */
menuRouter.post(
  "/menu-items/:id/restore",
  requireStaff,
  ah(async (req, res) => {
    const id = parseIntParam(req.params.id);
    const item = await prisma.$transaction(async (tx) => {
      const restored = await tx.menuItem.update({
        where: { id },
        data: { archived_at: null, is_available: false },
        include: { combo_steps: true },
      });
      await tx.category.updateMany({ where: { id: restored.category_id, archived_at: { not: null } }, data: { archived_at: null } });
      return restored;
    });
    broadcast.menuUpdated();
    res.json(serializeMenuItem(item));
  }),
);
