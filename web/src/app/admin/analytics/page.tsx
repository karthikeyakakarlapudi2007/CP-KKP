import { redirect } from "next/navigation";

export default function LegacyAnalyticsRoute() {
  redirect("/admin?tab=analytics");
}
