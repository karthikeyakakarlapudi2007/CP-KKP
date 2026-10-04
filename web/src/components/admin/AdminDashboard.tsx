"use client";
import { useSearchParams } from "next/navigation";
import { AnalyticsTab } from "./AnalyticsTab";
import { LiveOrdersTab } from "./LiveOrdersTab";
import { MenuInventoryTab } from "./MenuInventoryTab";
import { parseTab } from "./tabs";

export function AdminDashboard() {
  const tab = parseTab(useSearchParams().get("tab"));
  if (tab === "menu") return <MenuInventoryTab />;
  if (tab === "analytics") return <AnalyticsTab />;
  return <LiveOrdersTab />;
}
