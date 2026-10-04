"use client";
import { ErrorView } from "@/components/shared/ErrorView";

export default function TableError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorView title="Something went wrong / ఏదో పొరపాటు జరిగింది" message="Please try again or call a server." onRetry={reset} />;
}
