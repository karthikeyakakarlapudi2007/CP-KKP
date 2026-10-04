"use client";
import { useEffect } from "react";
import { ErrorView } from "@/components/shared/ErrorView";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return <ErrorView title="Something went wrong / ఏదో పొరపాటు జరిగింది" message={error.message} onRetry={reset} />;
}
