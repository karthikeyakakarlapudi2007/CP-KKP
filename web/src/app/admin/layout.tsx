import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { StaffGate } from "@/components/shared/StaffGate";

export const metadata: Metadata = { title: { default: "Merchant Dashboard", template: "%s · Admin" } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGate>
      <AdminShell>{children}</AdminShell>
    </StaffGate>
  );
}
