"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The server groups sessions by calendar day and formats clock times, so it has
 * to know the browser's time zone. This reports it through a cookie and
 * re-renders when the server was using a different one.
 */
export function TimeZoneSync({
  cookieName,
  reportedTimeZone,
}: {
  cookieName: string;
  reportedTimeZone: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone === reportedTimeZone) return;
    document.cookie = `${cookieName}=${encodeURIComponent(browserTimeZone)}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
    router.refresh();
  }, [cookieName, reportedTimeZone, router]);

  return null;
}
