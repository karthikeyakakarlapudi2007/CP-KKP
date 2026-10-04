import { redirect } from "next/navigation";

export default function LegacyMenuRoute() {
  redirect("/admin?tab=menu");
}
