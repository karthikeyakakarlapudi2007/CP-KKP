import type { Metadata } from "next";
import { CustomerApp } from "@/components/customer/CustomerApp";

export const metadata: Metadata = { title: "Menu" };

export default async function TablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params;
  return <CustomerApp tableRef={decodeURIComponent(tableId)} />;
}
