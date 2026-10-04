"use client";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FullScreenLoader } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useStaffStore } from "@/store/useStaffStore";
import { ErrorView } from "./ErrorView";

/**
 * When the server runs with STAFF_API_KEY, staff screens ask for that shared key once
 * per device. Without it (local dev) the gate is transparent.
 */
export function StaffGate({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const { key, rejectedAt, setKey } = useStaffStore();
  const [required, setRequired] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    api
      .config()
      .then((c) => setRequired(c.staff_key_required))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <ErrorView dark={dark} title="Cannot reach the server" message="Check NEXT_PUBLIC_API_URL and that the API is running." onRetry={() => location.reload()} />;
  if (!hydrated || required === null) return <div className={dark ? "bg-neutral-950" : ""}><FullScreenLoader /></div>;
  if (!required || key) return <>{children}</>;

  return (
    <div className={`flex min-h-dvh items-center justify-center p-6 ${dark ? "dark bg-background text-foreground" : ""}`}>
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) setKey(draft.trim());
        }}
      >
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h1 className="text-lg font-bold">Staff access</h1>
        </div>
        <p className="text-sm text-muted-foreground">Enter the restaurant staff key to open this screen.</p>
        {rejectedAt > 0 && <p className="text-sm font-semibold text-destructive">That key was not accepted.</p>}
        <Input type="password" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Staff key" autoComplete="current-password" />
        <Button type="submit" className="w-full">Unlock</Button>
      </form>
    </div>
  );
}
