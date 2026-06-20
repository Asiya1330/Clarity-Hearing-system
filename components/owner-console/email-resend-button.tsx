"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OWNER_CONSOLE_API_PREFIX } from "@/lib/owner-console/constants";

/** Resends to the CLINIC OWNER (raw recipient addresses are not retained for
 *  privacy). The button label and confirm copy make that explicit. */
export function EmailResendButton({ emailLogId }: { emailLogId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const resend = async () => {
    if (!confirm("Resend a copy of this notification to the clinic owner?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `${OWNER_CONSOLE_API_PREFIX}/email-logs/${emailLogId}/resend`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not resend.");
        setBusy(false);
        return;
      }
      setMsg("Sent to owner.");
      setBusy(false);
      router.refresh();
    } catch {
      setMsg("Could not resend.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={resend} disabled={busy}>
        {busy ? "Sending…" : "Resend to owner"}
      </Button>
      {msg && <span className="text-xs text-brand-muted">{msg}</span>}
    </div>
  );
}
