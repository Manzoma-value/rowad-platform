"use client";

import PlatformErrorFallback from "@/components/PlatformErrorFallback";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PlatformErrorFallback error={error} reset={reset} />;
}
