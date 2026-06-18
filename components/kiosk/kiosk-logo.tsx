"use client";

import { useEffect, useState } from "react";
import { CLINIC_LOGO_KEY } from "@/components/onboarding/logo-asset-field";

interface Props {
  serverLogo?: string | null;
  clinic: string;
}

/**
 * Kiosk logo slot. Resolves in order:
 *   serverLogo (e.g. the ?logo= override) → localStorage[CLINIC_LOGO_KEY] →
 *   a labelled dashed placeholder.
 *
 * The localStorage read happens in an effect (after mount), so the server
 * markup and first client paint always match — no hydration mismatch.
 */
export function KioskLogo({ serverLogo, clinic }: Props) {
  const [localLogo, setLocalLogo] = useState<string | null>(null);

  useEffect(() => {
    if (serverLogo) return; // a server-provided logo always wins
    try {
      setLocalLogo(window.localStorage.getItem(CLINIC_LOGO_KEY));
    } catch {
      /* ignore localStorage read errors */
    }
  }, [serverLogo]);

  const logo = serverLogo ?? localLogo;

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={`${clinic} logo`}
        className="h-14 w-40 object-contain object-left"
      />
    );
  }

  return (
    <div className="flex h-14 w-40 items-center justify-center rounded-lg border-2 border-dashed border-brand-line-strong text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
      Clinic logo
    </div>
  );
}
