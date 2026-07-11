"use client";

import PlatformErrorFallback from "@/components/PlatformErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PlatformErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
