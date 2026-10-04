export type Lang = "en" | "te";

export type ComboOption = { id: string; name_en: string; name_te: string; additional_price: number };

export type ComboStep = {
  id?: number;
  step_number: number;
  step_title_en: string;
  step_title_te: string;
  is_required: boolean;
  max_select: number;
  options: ComboOption[];
};

export type MenuItem = {
  id: number;
  category_id: number;
  name_en: string;
  name_te: string;
  description_en: string | null;
  description_te: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_combo: boolean;
  combo_steps: ComboStep[];
};

export type Category = {
  id: number;
  name_en: string;
  name_te: string;
  sort_order: number;
  items: MenuItem[];
};

export type OrderStatus = "pending" | "preparing" | "served" | "paid" | "cancelled";
export type TableStatus = "vacant" | "occupied" | "bill_requested";

export type SelectedStep = {
  step_number: number;
  step_title_en: string;
  step_title_te: string;
  options: ComboOption[];
};

export type OrderItem = {
  id: number;
  menu_item_id: number;
  item_name_snapshot: string;
  quantity: number;
  unit_price: number;
  selected_combo_options: SelectedStep[] | null;
  item_notes: string | null;
};

export type Order = {
  id: string;
  table_number: number;
  total_amount: number;
  status: OrderStatus;
  customer_notes: string | null;
  bill_requested: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
};

export type TableSummary = {
  id: number;
  qr_code_token: string;
  status: TableStatus;
  active_orders: number;
  amount_due: number;
};

export type AnalyticsSummary = {
  range: string;
  since: string;
  revenue: number;
  fulfilled_orders: number;
  average_ticket: number;
  open_orders: number;
  top_dishes: { menu_item_id: number; name: string; quantity: number; revenue: number }[];
};
