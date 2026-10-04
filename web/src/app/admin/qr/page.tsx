import type { Metadata } from "next";
import { QrStickerSheet } from "@/components/admin/QrStickerSheet";

export const metadata: Metadata = { title: "Table QRs" };

export default function AdminQrPage() {
  return <QrStickerSheet />;
}
