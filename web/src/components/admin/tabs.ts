import { BarChart3, ClipboardList, QrCode, UtensilsCrossed } from "lucide-react";

export type AdminTab = "orders" | "menu" | "analytics";

export const ADMIN_TABS = [
  { id: "orders", label: "Live Orders", href: "/admin?tab=orders", icon: ClipboardList },
  { id: "menu", label: "Menu & Inventory", href: "/admin?tab=menu", icon: UtensilsCrossed },
  { id: "analytics", label: "Analytics", href: "/admin?tab=analytics", icon: BarChart3 },
  { id: "qr", label: "Table QRs", href: "/admin/qr", icon: QrCode },
] as const;

export const parseTab = (v: string | null): AdminTab => (v === "menu" || v === "analytics" ? v : "orders");
