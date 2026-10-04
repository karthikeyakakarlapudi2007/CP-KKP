import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../lib/http";
import type { ComboOption, CreateOrderInput } from "../lib/schemas";

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "preparing", "served"];

/** Allowed staff transitions. "paid" archives the ticket. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "served", "paid", "cancelled"],
  preparing: ["served", "paid", "cancelled"],
  served: ["paid"],
  paid: [],
  cancelled: [],
};

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new HttpError(409, `Cannot move order from ${from} to ${to}`);
  }
}

type StoredStep = {
  step_number: number;
  step_title_en: string;
  step_title_te: string;
  options: ComboOption[];
};

/**
 * Price and validate an order entirely server-side from the live menu.
 * Client-sent prices are never trusted.
 */
export async function buildOrder(input: CreateOrderInput) {
  const table = await prisma.restaurantTable.findUnique({ where: { id: input.table_number } });
  if (!table) throw new HttpError(404, `Table ${input.table_number} does not exist`);

  const ids = [...new Set(input.items.map((i) => i.menu_item_id))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { combo_steps: true },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const unavailable: number[] = [];
  let total = new Prisma.Decimal(0);

  const lines = input.items.map((line) => {
    const item = byId.get(line.menu_item_id);
    if (!item) throw new HttpError(400, `Menu item ${line.menu_item_id} not found`);
    if (!item.is_available || item.archived_at) {
      unavailable.push(item.id);
      return null;
    }

    let unit = new Prisma.Decimal(item.price);
    let selected: StoredStep[] | null = null;

    if (item.is_combo) {
      selected = [];
      const picks = line.combo_selections ?? {};
      const steps = [...item.combo_steps].sort((a, b) => a.step_number - b.step_number);
      for (const step of steps) {
        const options = step.options as unknown as ComboOption[];
        const chosenIds = [...new Set(picks[String(step.step_number)] ?? [])];
        if (step.is_required && chosenIds.length === 0) {
          throw new HttpError(400, `"${item.name_en}": ${step.step_title_en} is required`);
        }
        if (chosenIds.length > step.max_select) {
          throw new HttpError(400, `"${item.name_en}": pick at most ${step.max_select} for ${step.step_title_en}`);
        }
        const chosen = chosenIds.map((id) => {
          const opt = options.find((o) => o.id === id);
          if (!opt) throw new HttpError(400, `"${item.name_en}": invalid option ${id}`);
          unit = unit.add(new Prisma.Decimal(opt.additional_price || 0));
          return opt;
        });
        if (chosen.length) {
          selected.push({
            step_number: step.step_number,
            step_title_en: step.step_title_en,
            step_title_te: step.step_title_te,
            options: chosen,
          });
        }
      }
    }

    total = total.add(unit.mul(line.quantity));
    return {
      menu_item_id: item.id,
      item_name_snapshot: `${item.name_en} / ${item.name_te}`,
      quantity: line.quantity,
      unit_price: unit,
      selected_combo_options: selected ? (selected as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      item_notes: line.item_notes,
    };
  });

  if (unavailable.length) {
    throw new HttpError(409, "Some items just went out of stock", { unavailable_item_ids: unavailable });
  }

  return { table, lines: lines.filter((l): l is NonNullable<typeof l> => l !== null), total };
}
