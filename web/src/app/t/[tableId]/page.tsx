import type { Metadata } from "next";
import { CustomerApp } from "@/components/customer/CustomerApp";

type Params = { params: Promise<{ tableId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tableId } = await params;
  const n = Number(tableId);
  return { title: Number.isInteger(n) && n > 0 ? `Table ${n}` : "Menu" };
}

/** /t/[tableId] — zero-login dine-in ordering. The table number comes straight from the QR link. */
export default async function TablePage({ params }: Params) {
  const { tableId } = await params;
  return <CustomerApp tableRef={decodeURIComponent(tableId)} />;
}
