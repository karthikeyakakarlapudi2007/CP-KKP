"use client";
import { ErrorView } from "@/components/shared/ErrorView";

export default function KdsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorView dark title="Kitchen display crashed" message="Tap retry to reload tickets." onRetry={reset} />;
}
