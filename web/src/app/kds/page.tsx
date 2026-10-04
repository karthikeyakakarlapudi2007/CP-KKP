import type { Metadata } from "next";
import { KdsBoard } from "@/components/kds/KdsBoard";
import { StaffGate } from "@/components/shared/StaffGate";

export const metadata: Metadata = { title: "Kitchen Display" };

export default function KdsPage() {
  return (
    <StaffGate dark>
      <KdsBoard />
    </StaffGate>
  );
}
