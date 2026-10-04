import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const comboOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name_en: text(120),
  name_te: text(120),
  additional_price: z.coerce.number().min(0).max(100000),
});
export type ComboOption = z.infer<typeof comboOptionSchema>;

export const comboStepSchema = z
  .object({
    step_number: z.coerce.number().int().min(1).max(20),
    step_title_en: text(120),
    step_title_te: text(120),
    is_required: z.boolean().default(true),
    max_select: z.coerce.number().int().min(1).max(20).default(1),
    options: z.array(comboOptionSchema).min(1).max(50),
  })
  .refine((s) => new Set(s.options.map((o) => o.id)).size === s.options.length, {
    message: "Option ids must be unique within a step",
  });

/** At least one character from the Telugu Unicode block (U+0C00–U+0C7F) */
const TELUGU = /[\u0C00-\u0C7F]/;
const teluguText = (max: number) => text(max).refine((v) => TELUGU.test(v), "Use Telugu script (తెలుగు)");

export const categorySchema = z.object({
  name_en: text(80),
  name_te: teluguText(80),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
});

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Image URL must be http(s)");

export const menuItemSchema = z
  .object({
    category_id: z.coerce.number().int().positive(),
    name_en: text(120),
    name_te: teluguText(120),
    description_en: optText(500),
    description_te: optText(500),
    price: z.coerce.number().min(0).max(100000),
    image_url: z
      .union([httpUrl, z.literal(""), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    is_available: z.boolean().default(true),
    is_combo: z.boolean().default(false),
    combo_steps: z.array(comboStepSchema).max(10).optional(),
  })
  .refine(
    (i) => !i.combo_steps || new Set(i.combo_steps.map((s) => s.step_number)).size === i.combo_steps.length,
    { message: "Step numbers must be unique" },
  )
  .refine((i) => !i.is_combo || (i.combo_steps?.length ?? 0) > 0, {
    message: "Combo items need at least one step",
    path: ["combo_steps"],
  });

export const reorderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export const availabilitySchema = z.object({ is_available: z.boolean() });

export const createOrderSchema = z.object({
  table_number: z.coerce.number().int().positive(),
  customer_notes: optText(500),
  items: z
    .array(
      z.object({
        menu_item_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(50),
        item_notes: optText(200),
        /** step_number -> selected option ids */
        combo_selections: z.record(z.string(), z.array(z.string().max(64)).max(20)).optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const statusUpdateSchema = z.object({
  status: z.enum(["preparing", "served", "paid", "cancelled"]),
});

/* ---- Socket command payloads ---- */

export const socketJoinSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("customer"), table: z.coerce.number().int().positive() }),
  z.object({ role: z.enum(["admin", "kds"]), staffKey: z.string().max(200).optional() }),
]);

export const socketUpdateStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: statusUpdateSchema.shape.status,
});

export const socketToggleSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  is_available: z.boolean(),
});

export const socketRequestBillSchema = z.object({
  table_number: z.coerce.number().int().positive(),
});
