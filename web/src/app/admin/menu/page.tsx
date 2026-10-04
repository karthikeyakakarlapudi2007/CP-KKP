import type { Metadata } from "next";
import { MenuManager } from "@/components/admin/MenuManager";

export const metadata: Metadata = { title: "Menu" };

export default function AdminMenuPage() {
  return <MenuManager />;
}
