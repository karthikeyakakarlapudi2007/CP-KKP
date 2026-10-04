"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Grid2x2, Grid3x3, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { siteUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

type Layout = 2 | 3;

function triggerDownload(name: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Serialise the rendered QR <svg> and, for PNG, rasterise it at print resolution. */
async function downloadQr(svg: SVGSVGElement | null, table: number, format: "svg" | "png") {
  if (!svg) return;
  const markup = new XMLSerializer().serializeToString(svg);
  const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  if (format === "svg") return triggerDownload(`table-${table}-qr.svg`, svgUrl);

  const img = new Image();
  img.src = svgUrl;
  await img.decode();
  const size = 1200; // ~10 cm at 300 dpi
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  URL.revokeObjectURL(svgUrl);
  canvas.toBlob((blob) => blob && triggerDownload(`table-${table}-qr.png`, URL.createObjectURL(blob)), "image/png");
}

function Sticker({ table, url, layout }: { table: number; url: string; layout: Layout }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const big = layout === 2;
  return (
    <div className="flex h-full flex-col">
      <article
        className={cn(
          "sticker flex flex-1 flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-[#b8321f] bg-white text-center text-stone-900 shadow-sm",
          big ? "gap-2.5 p-5" : "gap-1.5 p-3",
        )}
      >
        <header className="w-full">
          <p className={cn("font-black leading-tight tracking-tight text-[#b8321f]", big ? "text-2xl" : "text-base")}>Kodikura Pappucharu</p>
          <p className={cn("font-semibold text-stone-500", big ? "text-base" : "text-[10px]")} lang="te">కోడికూర పప్పుచారు</p>
        </header>

        <p className={cn("font-semibold leading-snug", big ? "text-base" : "text-[10px] leading-tight")}>
          Scan to Order & Customize
          <span className="block" lang="te">ఆర్డర్ చేయడానికి స్కాన్ చేయండి</span>
        </p>

        <div className={cn("border-stone-900 bg-white", big ? "rounded-2xl border-4 p-2" : "rounded-xl border-[3px] p-1")}>
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={big ? 200 : 108}
            level="M"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#1c1917"
            title={`Order at table ${table}`}
          />
        </div>

        <div className={cn("w-full rounded-2xl bg-[#b8321f] text-white", big ? "py-2" : "py-1")}>
          <p className={cn("font-black tracking-widest", big ? "text-4xl" : "text-xl")}>TABLE {table}</p>
        </div>
        <p className={cn("text-stone-500", big ? "text-xs" : "text-[8px] leading-none")}>No app · No login · Pay at your table</p>
      </article>
      <div className="no-print mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate" title={url}>{url}</span>
        <span className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" onClick={() => void downloadQr(svgRef.current, table, "svg")} aria-label={`Download table ${table} QR as SVG`}>
            <Download /> SVG
          </Button>
          <Button size="sm" variant="outline" onClick={() => void downloadQr(svgRef.current, table, "png")} aria-label={`Download table ${table} QR as PNG`}>
            <Download /> PNG
          </Button>
        </span>
      </div>
    </div>
  );
}

export function QrStickerSheet() {
  const [base, setBase] = useState("");
  const [count, setCount] = useState(10);
  const [layout, setLayout] = useState<Layout>(2);

  useEffect(() => {
    setBase(siteUrl());
    // default to however many tables exist in the restaurant
    api.tables().then((t) => t.length && setCount(t.length)).catch(() => undefined);
  }, []);

  const root = base.replace(/\/+$/, "");
  const perPage = layout * layout;
  const pages = useMemo(() => {
    const tables = Array.from({ length: count }, (_, i) => i + 1);
    return Array.from({ length: Math.ceil(tables.length / perPage) }, (_, p) => tables.slice(p * perPage, (p + 1) * perPage));
  }, [count, perPage]);

  return (
    <div className="qr-root space-y-5">
      <div className="no-print flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-extrabold">Table QR Stickers</h1>
          <p className="text-sm text-muted-foreground">Each code opens the dine-in menu for its table. Prints on A4, {perPage} stickers per page.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="qr-base">Site URL</Label>
          <Input id="qr-base" className="w-72" value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://your-domain" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qr-count">Tables</Label>
          <Input id="qr-count" type="number" min={1} max={100} className="w-24" value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Layout</span>
          <div className="flex rounded-lg border bg-card p-1" role="radiogroup" aria-label="Stickers per page">
            {([2, 3] as const).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={layout === l}
                onClick={() => setLayout(l)}
                className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold", layout === l ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {l === 2 ? <Grid2x2 className="size-4" /> : <Grid3x3 className="size-4" />} {l}×{l}
              </button>
            ))}
          </div>
        </div>
        <Button size="lg" onClick={() => window.print()} disabled={!root}>
          <Printer /> Print QR Stickers
        </Button>
      </div>

      {!/^https?:\/\//.test(root) && (
        <p className="no-print rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">Enter the full site URL (starting with https://) so the codes open your live menu.</p>
      )}

      <div className="qr-pages space-y-8 print:space-y-0">
        {pages.map((tables, p) => (
          <section
            key={p}
            aria-label={`Sheet ${p + 1}`}
            className={cn(
              "qr-page grid gap-6 rounded-2xl bg-muted/40 p-6",
              layout === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3",
            )}
            style={{ ["--cols" as string]: layout }}
          >
            {tables.map((n) => (
              <Sticker key={n} table={n} url={`${root}/t/${n}`} layout={layout} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
