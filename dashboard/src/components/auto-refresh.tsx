"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the current route's server data fresh without a manual refresh.
 *
 * Device rows change out-of-band (the SDK registers devices via the API, no
 * dashboard action runs), so there's nothing to invalidate the client cache.
 * This re-runs the page's Server Components on an interval and whenever the tab
 * regains focus — giving near-realtime counts/lists. `router.refresh()`
 * reconciles without dropping client state. Polling pauses while the tab is
 * hidden to avoid background load.
 *
 * Renders nothing. Use only on data-viewing pages (not forms).
 */
export function AutoRefresh({ interval = 10000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, interval);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, interval]);

  return null;
}
