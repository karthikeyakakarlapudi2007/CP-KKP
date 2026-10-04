import Link from "next/link";
import { ChefHat, LayoutDashboard, QrCode, UtensilsCrossed } from "lucide-react";

const links = [
  { href: "/admin", label: "Merchant Dashboard", sub: "Orders, menu, analytics", icon: LayoutDashboard },
  { href: "/kds", label: "Kitchen Display", sub: "Live tickets for the kitchen", icon: ChefHat },
  { href: "/admin/qr", label: "Table QR Codes", sub: "Print QR stickers for tables", icon: QrCode },
  { href: "/t/1", label: "Guest Menu (Table 1)", sub: "Preview the customer experience", icon: UtensilsCrossed },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Dine-In System</p>
        <h1 className="text-3xl font-extrabold">Kodikura Pappucharu</h1>
        <p className="text-lg text-muted-foreground">కోడికూర పప్పుచారు</p>
      </div>
      <div className="grid gap-3">
        {links.map(({ href, label, sub, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary">
            <Icon className="size-6 text-primary" />
            <div>
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground">{sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
