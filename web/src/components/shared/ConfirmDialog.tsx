"use client";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** when set, the action is blocked: only a close button is shown */
  blockedReason?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", destructive, blockedReason, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent role="alertdialog" aria-describedby="confirm-desc" className="p-6">
        <div className="flex gap-4">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${destructive || blockedReason ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription id="confirm-desc" asChild>
              <div className="mt-1.5 space-y-2 text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
            {blockedReason && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{blockedReason}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{blockedReason ? "OK" : "Cancel"}</Button>
          {!blockedReason && (
            <Button variant={destructive ? "destructive" : "default"} onClick={() => void confirm()} disabled={busy}>
              {busy && <Spinner className="size-4 text-white" />} {confirmLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
