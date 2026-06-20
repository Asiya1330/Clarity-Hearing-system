"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { Panel } from "@/components/owner-console/console-ui";
import { OWNER_CONSOLE_API_PREFIX } from "@/lib/owner-console/constants";

export interface ClinicActionsProps {
  clinicId: string;
  clinicName: string;
  accountStatus: string;
  isSuperAdmin: boolean;
  stripeConfigured: boolean;
  hasSubscription: boolean;
  retentionCouponConfigured: boolean;
  resendConfigured: boolean;
  entitlements: {
    enable_kiosk_mode: boolean;
    enable_presentation_mode: boolean;
    enable_audiogram_ai_beta: boolean;
    notes: string | null;
  };
}

export function ClinicActions(props: ClinicActionsProps) {
  return (
    <div className="flex flex-col gap-6">
      <AccountControl {...props} />
      <EntitlementsControl {...props} />
      <BillingControl {...props} />
      <EmailControl {...props} />
    </div>
  );
}

function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const post = async (path: string, body?: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${OWNER_CONSOLE_API_PREFIX}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        setBusy(false);
        return false;
      }
      setNotice("Done.");
      setBusy(false);
      router.refresh();
      return true;
    } catch {
      setError("Action failed.");
      setBusy(false);
      return false;
    }
  };

  return { busy, error, notice, post };
}

function AccountControl(props: ClinicActionsProps) {
  const { clinicId, clinicName, accountStatus, isSuperAdmin } = props;
  const { busy, error, post } = useApi();
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const suspended = accountStatus === "suspended";
  const match = confirmText.trim().toLowerCase() === clinicName.trim().toLowerCase();

  if (!isSuperAdmin) {
    return (
      <Panel title="Account status">
        <p className="text-sm text-brand-muted">
          Status: <strong>{accountStatus}</strong>. Suspension/reactivation
          requires a super-admin.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Account status">
      <p className="mb-3 text-sm text-brand-muted">
        Current status: <strong className={suspended ? "text-rose-700" : "text-emerald-700"}>{accountStatus}</strong>
      </p>
      {!suspended && (
        <div className="grid gap-2">
          <Label htmlFor="suspend-reason" className="text-sm">Reason (required)</Label>
          <Input
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. non-payment, abuse report"
          />
        </div>
      )}
      <div className="mt-3 grid gap-2">
        <Label htmlFor="confirm-name" className="text-sm">
          Type the clinic name to confirm: <code>{clinicName}</code>
        </Label>
        <Input
          id="confirm-name"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>
      {error && <div className="mt-3"><FormError message={error} /></div>}
      <div className="mt-4">
        {suspended ? (
          <Button
            disabled={busy || !match}
            onClick={() => post(`/clinics/${clinicId}/reactivate`, { confirmText })}
          >
            {busy ? "Working…" : "Reactivate clinic"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            disabled={busy || !match || reason.trim().length < 3}
            onClick={() =>
              post(`/clinics/${clinicId}/suspend`, { confirmText, reason })
            }
          >
            {busy ? "Working…" : "Suspend clinic"}
          </Button>
        )}
      </div>
    </Panel>
  );
}

function EntitlementsControl(props: ClinicActionsProps) {
  const { clinicId, entitlements } = props;
  const { busy, error, notice, post } = useApi();
  const [kiosk, setKiosk] = useState(entitlements.enable_kiosk_mode);
  const [presentation, setPresentation] = useState(entitlements.enable_presentation_mode);
  const [ai, setAi] = useState(entitlements.enable_audiogram_ai_beta);
  const [notes, setNotes] = useState(entitlements.notes ?? "");

  const save = () =>
    post(`/clinics/${clinicId}/entitlements`, {
      enable_kiosk_mode: kiosk,
      enable_presentation_mode: presentation,
      enable_audiogram_ai_beta: ai,
      notes: notes || null,
    });

  return (
    <Panel title="Feature entitlements">
      <div className="flex flex-col gap-3">
        <Toggle label="Enable Kiosk Mode" checked={kiosk} onChange={setKiosk} />
        <Toggle
          label="Enable Special Presentation Mode"
          checked={presentation}
          onChange={setPresentation}
        />
        <Toggle
          label="Beta: Audiogram-to-Conversation AI"
          checked={ai}
          onChange={setAi}
        />
        <div className="grid gap-2">
          <Label htmlFor="entitlement-notes" className="text-sm">Notes</Label>
          <textarea
            id="entitlement-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-brand-line bg-transparent px-3 py-2 text-sm"
          />
        </div>
        {error && <FormError message={error} />}
        {notice && <span className="text-xs text-emerald-700">{notice}</span>}
        <div>
          <Button size="sm" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save entitlements"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function BillingControl(props: ClinicActionsProps) {
  const {
    clinicId,
    isSuperAdmin,
    stripeConfigured,
    hasSubscription,
    retentionCouponConfigured,
  } = props;
  const { busy, error, notice, post } = useApi();

  const disabledReason = !isSuperAdmin
    ? "Billing actions require a super-admin."
    : !stripeConfigured
      ? "Stripe is not configured (STRIPE_SECRET_KEY missing)."
      : !hasSubscription
        ? "This clinic has no Stripe subscription id."
        : null;

  return (
    <Panel title="Billing (Stripe)">
      {disabledReason ? (
        <p className="text-sm text-brand-muted">{disabledReason}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {error && <FormError message={error} />}
          {notice && <span className="text-xs text-emerald-700">{notice}</span>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => post(`/clinics/${clinicId}/billing/extend-trial`, { days: 14 })}
            >
              Extend trial 14 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !retentionCouponConfigured}
              onClick={() => post(`/clinics/${clinicId}/billing/apply-coupon`, {})}
            >
              {retentionCouponConfigured
                ? "Apply retention coupon"
                : "Retention coupon not configured"}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function EmailControl(props: ClinicActionsProps) {
  const { clinicId, resendConfigured } = props;
  const { busy, error, notice, post } = useApi();

  if (!resendConfigured) {
    return (
      <Panel title="Email">
        <p className="text-sm text-brand-muted">
          Email sending is not configured (RESEND_API_KEY / INTAKE_EMAIL_FROM).
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Email">
      <div className="flex flex-col gap-3">
        {error && <FormError message={error} />}
        {notice && <span className="text-xs text-emerald-700">{notice}</span>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => post(`/clinics/${clinicId}/diagnostic-email`, { kind: "diagnostic" })}
          >
            Send diagnostic email
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => post(`/clinics/${clinicId}/diagnostic-email`, { kind: "reset" })}
          >
            Send password reset link
          </Button>
        </div>
        <p className="text-xs text-brand-muted">Both are sent to the clinic owner.</p>
      </div>
    </Panel>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-brand-navy">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-brand-line text-brand-teal focus:ring-brand-teal"
      />
    </label>
  );
}
