import type { Metadata } from "next";
import { QrSheet } from "@/components/admin/QrSheet";

export const metadata: Metadata = { title: "Table QR Codes" };

export default function AdminQrPage() {
  return <QrSheet />;
}
