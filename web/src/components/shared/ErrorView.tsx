"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorView({ title, message, onRetry, dark }: { title: string; message?: string; onRetry?: () => void; dark?: boolean }) {
  return (
    <div className={`flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center ${dark ? "bg-neutral-950 text-white" : ""}`}>
      <AlertTriangle className="size-12 text-primary" />
      <h1 className="text-xl font-bold">{title}</h1>
      {message && <p className="max-w-md text-sm opacity-70">{message}</p>}
      {onRetry && <Button onClick={onRetry}>Retry / మళ్ళీ ప్రయత్నించు</Button>}
    </div>
  );
}
