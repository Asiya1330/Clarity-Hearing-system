"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OWNER_CONSOLE_API_PREFIX } from "@/lib/owner-console/paths";

export function KioskRevokeButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    if (!confirm("Force-kill this kiosk session? The patient link will stop working immediately.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${OWNER_CONSOLE_API_PREFIX}/kiosk-sessions/${linkId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Force-killed from owner console." }),
        },
      );
      if (!res.ok) {
        setError("Could not revoke.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not revoke.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="destructive" size="sm" onClick={revoke} disabled={busy}>
        {busy ? "Killing…" : "Force kill"}
      </Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
