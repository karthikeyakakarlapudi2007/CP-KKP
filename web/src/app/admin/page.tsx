import type { Metadata } from "next";
import { OrdersCenter } from "@/components/admin/OrdersCenter";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return <OrdersCenter />;
}
