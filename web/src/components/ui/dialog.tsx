"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title className={cn("text-lg font-bold leading-tight", className)} {...p} />
);
export const DialogDescription = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...p} />
);

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** "center" = modal, "bottom" = mobile bottom sheet / drawer */
  side?: "center" | "bottom";
  hideClose?: boolean;
};

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, ContentProps>(
  ({ className, children, side = "center", hideClose, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-card text-card-foreground shadow-2xl focus:outline-none",
          side === "center" &&
            "inset-x-4 top-1/2 mx-auto max-h-[90dvh] max-w-lg -translate-y-1/2 rounded-2xl [&>*]:animate-pop",
          side === "bottom" && "inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-lg animate-slide-up rounded-t-3xl",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
DialogContent.displayName = "DialogContent";
