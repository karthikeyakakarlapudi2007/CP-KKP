import type { Prisma } from "@prisma/client";

/** Prisma Decimal -> number (two-decimal currency values are safe as JS numbers). */
export const num = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : typeof d === "number" ? d : Number(d.toString());

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

export function serializeOrder(o: OrderWithItems) {
  return {
    id: o.id,
    table_number: o.table_number,
    total_amount: num(o.total_amount),
    status: o.status,
    customer_notes: o.customer_notes,
    bill_requested: o.bill_requested,
    created_at: o.created_at.toISOString(),
    updated_at: o.updated_at.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      menu_item_id: i.menu_item_id,
      item_name_snapshot: i.item_name_snapshot,
      quantity: i.quantity,
      unit_price: num(i.unit_price),
      selected_combo_options: i.selected_combo_options,
      item_notes: i.item_notes,
    })),
  };
}

type ItemWithSteps = Prisma.MenuItemGetPayload<{ include: { combo_steps: true } }>;

export function serializeMenuItem(i: ItemWithSteps) {
  return {
    id: i.id,
    category_id: i.category_id,
    name_en: i.name_en,
    name_te: i.name_te,
    description_en: i.description_en,
    description_te: i.description_te,
    price: num(i.price),
    image_url: i.image_url,
    is_available: i.is_available,
    is_combo: i.is_combo,
    combo_steps: [...i.combo_steps]
      .sort((a, b) => a.step_number - b.step_number)
      .map((s) => ({
        id: s.id,
        step_number: s.step_number,
        step_title_en: s.step_title_en,
        step_title_te: s.step_title_te,
        is_required: s.is_required,
        max_select: s.max_select,
        options: s.options,
      })),
  };
}
