"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChefHat, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/lib/chime";
import { Toaster } from "@/components/shared/Toaster";
import { cn } from "@/lib/utils";
import { useStaffStore } from "@/store/useStaffStore";
import { BillAlertBanner } from "./BillAlertBanner";
import { ADMIN_TABS, parseTab } from "./tabs";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const tab = parseTab(useSearchParams().get("tab"));
  const soundOn = useStaffStore((s) => s.soundOn);
  const setSoundOn = useStaffStore((s) => s.setSoundOn);
  const activeId = path.startsWith("/admin/qr") ? "qr" : tab;

  return (
    <div className="min-h-dvh bg-background">
      <header className="no-print sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 py-3">
          <Link href="/admin" className="shrink-0 leading-tight">
            <span className="block font-extrabold text-primary">Kodikura Pappucharu</span>
            <span className="block text-xs text-muted-foreground">Merchant Control Center</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Dashboard sections">
            {ADMIN_TABS.map(({ id, label, href, icon: Icon }) => (
              <Link
                key={id}
                href={href}
                role="tab"
                aria-selected={activeId === id}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  activeId === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <Button
            size="sm"
            variant={soundOn ? "outline" : "accent"}
            className={cn(!soundOn && "animate-pulse")}
            onClick={async () => {
              if (!soundOn) await unlockAudio();
              setSoundOn(!soundOn);
            }}
          >
            {soundOn ? <Volume2 /> : <VolumeX />} {soundOn ? "Alerts on" : "Enable sound alerts"}
          </Button>
          <Link href="/kds" target="_blank" className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <ChefHat className="size-4" /> Open KDS
          </Link>
        </div>
        <BillAlertBanner />
      </header>
      <div className="mx-auto max-w-[1600px] p-6 print:max-w-none print:p-0">{children}</div>
      <Toaster />
    </div>
  );
}
