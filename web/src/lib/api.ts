import { API_URL } from "./config";
import { useStaffStore } from "@/store/useStaffStore";
import type { AnalyticsSummary, Category, ComboStep, Order, TableStatus, TableSummary } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { staff?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.staff) {
    const key = useStaffStore.getState().key;
    if (key) headers.set("x-staff-key", key);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Network error — is the server reachable?");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && init.staff) useStaffStore.getState().invalidate();
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.details);
  }
  return body as T;
}

const json = (b: unknown) => JSON.stringify(b);

export type CreateOrderBody = {
  table_number: number;
  customer_notes?: string | null;
  items: { menu_item_id: number; quantity: number; item_notes?: string | null; combo_selections?: Record<string, string[]> }[];
};

export type MenuItemInput = {
  category_id: number;
  name_en: string;
  name_te: string;
  description_en?: string | null;
  description_te?: string | null;
  price: number;
  image_url?: string | null;
  is_available: boolean;
  is_combo: boolean;
  combo_steps?: Omit<ComboStep, "id">[];
};

export type CategoryInput = { name_en: string; name_te: string; sort_order: number };

export const api = {
  config: () => request<{ staff_key_required: boolean }>("/api/config"),
  menu: () => request<{ categories: Category[] }>("/api/menu"),

  // Customer
  table: (ref: string) => request<{ id: number; status: TableStatus }>(`/api/tables/${encodeURIComponent(ref)}`),
  tableOrders: (ref: string | number) =>
    request<{ table: { id: number; status: TableStatus }; orders: Order[] }>(`/api/tables/${ref}/orders`),
  placeOrder: (body: CreateOrderBody) => request<Order>("/api/orders", { method: "POST", body: json(body) }),
  requestBill: (table: number) =>
    request<{ table_number: number; amount_due: number }>(`/api/tables/${table}/request-bill`, { method: "POST" }),

  // Staff
  orders: (scope: "active" | "history" = "active", limit = 100) =>
    request<Order[]>(`/api/orders?scope=${scope}&limit=${limit}`, { staff: true }),
  setOrderStatus: (id: string, status: "preparing" | "served" | "paid" | "cancelled") =>
    request<Order>(`/api/orders/${id}/status`, { method: "PATCH", body: json({ status }), staff: true }),
  tables: () => request<TableSummary[]>("/api/tables", { staff: true }),
  settleTable: (table: number) => request<{ settled_order_ids: string[] }>(`/api/tables/${table}/settle`, { method: "POST", staff: true }),
  analytics: (range: "today" | "7d" | "30d", top = 10) =>
    request<AnalyticsSummary>(`/api/analytics/summary?range=${range}&top=${top}`, { staff: true }),

  toggleAvailability: (id: number, is_available: boolean) =>
    request<{ id: number; is_available: boolean }>(`/api/menu-items/${id}/availability`, {
      method: "PATCH",
      body: json({ is_available }),
      staff: true,
    }),
  createItem: (b: MenuItemInput) => request("/api/menu-items", { method: "POST", body: json(b), staff: true }),
  updateItem: (id: number, b: MenuItemInput) => request(`/api/menu-items/${id}`, { method: "PUT", body: json(b), staff: true }),
  deleteItem: (id: number) => request(`/api/menu-items/${id}`, { method: "DELETE", staff: true }),
  createCategory: (b: CategoryInput) => request("/api/categories", { method: "POST", body: json(b), staff: true }),
  updateCategory: (id: number, b: CategoryInput) => request(`/api/categories/${id}`, { method: "PUT", body: json(b), staff: true }),
  deleteCategory: (id: number) => request(`/api/categories/${id}`, { method: "DELETE", staff: true }),
};
