"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChefHat, ClipboardList, QrCode, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu & Stock", icon: UtensilsCrossed },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/qr", label: "Table QR", icon: QrCode },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh bg-background">
      <header className="no-print sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 py-3">
          <Link href="/admin" className="leading-tight">
            <span className="block font-extrabold text-primary">Kodikura Pappucharu</span>
            <span className="block text-xs text-muted-foreground">Merchant Dashboard</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? path === href : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <Link href="/kds" target="_blank" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <ChefHat className="size-4" /> Open KDS
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] p-6">{children}</div>
    </div>
  );
}
