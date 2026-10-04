import type { Metadata } from "next";
import { Analytics } from "@/components/admin/Analytics";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return <Analytics />;
}
