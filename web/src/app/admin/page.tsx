import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = { title: "Control Center" };

/** /admin?tab=orders|menu|analytics — the Table QRs tab lives at /admin/qr */
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center"><Spinner className="size-10" /></div>}>
      <AdminDashboard />
    </Suspense>
  );
}
