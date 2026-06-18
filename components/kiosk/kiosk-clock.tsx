"use client";

import { useEffect, useState } from "react";

/**
 * Live date + time for the kiosk resting screen.
 *
 * Renders nothing on the server AND on the first client paint, so the server
 * markup and the initial client markup are identical (no hydration mismatch).
 * Once mounted it fills in the current date/time and re-ticks every 30s.
 * Locale formatting is delegated to the browser via toLocaleDateString /
 * toLocaleTimeString.
 */
export function KioskClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Server render and first client paint: render nothing.
  if (!now) return null;

  return (
    <div className={className}>
      <div className="text-lg font-semibold tabular-nums text-brand-navy">
        {now.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>
      <div className="text-sm text-brand-muted">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
