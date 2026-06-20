"use client";

import { useEffect } from "react";
import { OWNER_CONSOLE_API_PREFIX } from "@/lib/owner-console/constants";

/**
 * Audits support-view open/close. Posts `start` on mount and `close` on
 * unmount (keepalive lets the close request survive navigation/unload). Both
 * events land in the immutable admin audit trail.
 */
export function SupportViewTracker({ clinicId }: { clinicId: string }) {
  useEffect(() => {
    const url = `${OWNER_CONSOLE_API_PREFIX}/clinics/${clinicId}/support-view`;
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "start" }),
    }).catch(() => {});

    return () => {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "close" }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [clinicId]);

  return null;
}
