"use client";
import { ErrorView } from "@/components/shared/ErrorView";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorView title="This screen hit an error" message={error.message} onRetry={reset} />;
}
