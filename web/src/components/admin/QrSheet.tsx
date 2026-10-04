"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { siteUrl } from "@/lib/config";

type Qr = { table: number; url: string; svg: string };

function download(name: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

export function QrSheet() {
  const [base, setBase] = useState("");
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<Qr[]>([]);

  useEffect(() => setBase(siteUrl()), []);

  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    const root = base.replace(/\/$/, "");
    Promise.all(
      Array.from({ length: count }, async (_, idx) => {
        const table = idx + 1;
        const url = `${root}/t/${table}`;
        const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });
        return { table, url, svg };
      }),
    ).then((list) => !cancelled && setCodes(list));
    return () => {
      cancelled = true;
    };
  }, [base, count]);

  const downloadSvg = (q: Qr) => download(`table-${q.table}.svg`, URL.createObjectURL(new Blob([q.svg], { type: "image/svg+xml" })));
  const downloadPng = async (q: Qr) => download(`table-${q.table}.png`, await QRCode.toDataURL(q.url, { width: 1024, margin: 2, errorCorrectionLevel: "M" }));

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold">Table QR Codes</h1>
          <p className="text-sm text-muted-foreground">Each code opens the dine-in menu for that table. Print and laminate for each table.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="base">Site URL</Label>
          <Input id="base" className="w-72" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="count">Tables</Label>
          <Input id="count" type="number" min={1} max={100} className="w-24" value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
        </div>
        <Button onClick={() => window.print()}><Printer /> Print all</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 print:grid-cols-3 print:gap-6">
        {codes.map((q) => (
          <div key={q.table} className="flex break-inside-avoid flex-col items-center rounded-2xl border-2 border-dashed bg-white p-4 text-center text-stone-900">
            <p className="text-xs font-bold uppercase tracking-widest text-[#b8321f]">Kodikura Pappucharu</p>
            <p className="text-3xl font-black">Table {q.table}</p>
            <div className="my-2 w-full max-w-44" dangerouslySetInnerHTML={{ __html: q.svg }} />
            <p className="text-sm font-semibold">Scan to order · స్కాన్ చేసి ఆర్డర్ చేయండి</p>
            <p className="mt-1 break-all text-[10px] text-stone-500">{q.url}</p>
            <div className="no-print mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadSvg(q)}><Download /> SVG</Button>
              <Button size="sm" variant="outline" onClick={() => void downloadPng(q)}><Download /> PNG</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
