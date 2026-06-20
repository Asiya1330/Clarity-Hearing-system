/**
 * Clinic account suspension / reactivation. SERVER-ONLY, owner-console use only
 * (callers MUST have passed requireOwnerConsoleAccess()/super_admin first).
 *
 * Invariant — Stripe and local state can never silently diverge:
 *   - On SUSPEND: if Stripe is configured AND the clinic has a subscription id,
 *     pause Stripe FIRST. Only flip local account_status after Stripe succeeds.
 *     If Stripe fails, account_status is left UNCHANGED, stripe_sync_status is
 *     marked 'sync_failed', the error is reported to Sentry, and a generic
 *     failure is returned.
 *   - On REACTIVATE: resume Stripe first (when applicable), then flip local.
 *   - When there is no subscription id, stripe_sync_status is 'not_applicable';
 *     when Stripe is not configured at all it is 'not_configured'.
 * Every outcome is audited.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";
import {
  isStripeConfigured,
  pauseOrCancelSubscriptionForSuspension,
  resumeSubscription,
} from "./stripe";

type StripeSyncStatus =
  | "not_configured"
  | "not_applicable"
  | "synced"
  | "sync_failed";

export interface AccountStatusResult {
  ok: boolean;
  /** Generic, safe-to-display message. */
  error?: string;
  stripeSyncStatus?: StripeSyncStatus;
}

export interface SuspendClinicInput {
  clinicId: string;
  reason: string;
  actor: AdminAuditActor;
  request?: Request;
}

export interface ReactivateClinicInput {
  clinicId: string;
  actor: AdminAuditActor;
  request?: Request;
}

interface ClinicBillingRow {
  id: string;
  account_status: string | null;
  stripe_subscription_id: string | null;
}

async function loadClinicBilling(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: ReturnType<typeof createAdminClient>,
  clinicId: string,
): Promise<ClinicBillingRow | null> {
  const { data } = await admin
    .from("clinics")
    .select("id, account_status, stripe_subscription_id")
    .eq("id", clinicId)
    .maybeSingle();
  return (data as ClinicBillingRow | null) ?? null;
}

export async function suspendClinic(
  input: SuspendClinicInput,
): Promise<AccountStatusResult> {
  const { clinicId, reason, actor, request } = input;
  const admin = createAdminClient();

  const clinic = await loadClinicBilling(admin, clinicId);
  if (!clinic) return { ok: false, error: "Clinic not found." };

  const hasSubscription = !!clinic.stripe_subscription_id;
  let syncStatus: StripeSyncStatus;

  if (isStripeConfigured() && hasSubscription) {
    const stripe = await pauseOrCancelSubscriptionForSuspension(
      clinic.stripe_subscription_id as string,
    );
    if (!stripe.ok) {
      // Do NOT change account_status. Record the divergence + alert.
      await admin
        .from("clinics")
        .update({
          stripe_sync_status: "sync_failed",
          stripe_last_synced_at: new Date().toISOString(),
        })
        .eq("id", clinicId);
      captureOwnerConsoleException(
        new Error("stripe.pause failed during clinic suspend"),
        "clinic.suspend",
        { clinicId, errorCode: stripe.errorCode },
      );
      await writeAdminAuditLog({
        actor,
        action: "clinic.suspend",
        targetType: "clinic",
        targetId: clinicId,
        targetClinicId: clinicId,
        metadata: { outcome: "stripe_failed", errorCode: stripe.errorCode },
        request,
      });
      return {
        ok: false,
        error: "Could not update billing; the clinic was NOT suspended.",
        stripeSyncStatus: "sync_failed",
      };
    }
    syncStatus = "synced";
  } else if (isStripeConfigured() && !hasSubscription) {
    syncStatus = "not_applicable";
  } else {
    syncStatus = "not_configured";
  }

  const { error: updateError } = await admin
    .from("clinics")
    .update({
      account_status: "suspended",
      suspended_at: new Date().toISOString(),
      suspended_by: actor.userId,
      suspension_reason: reason,
      stripe_sync_status: syncStatus,
      stripe_last_synced_at:
        syncStatus === "synced" ? new Date().toISOString() : null,
    })
    .eq("id", clinicId);

  if (updateError) {
    captureOwnerConsoleException(
      new Error("clinics.update failed during suspend"),
      "clinic.suspend",
      { clinicId, code: updateError.code },
    );
    return { ok: false, error: "Could not suspend the clinic. Try again." };
  }

  await writeAdminAuditLog({
    actor,
    action: "clinic.suspend",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: { outcome: "suspended", stripeSyncStatus: syncStatus, hadSubscription: hasSubscription },
    request,
  });

  return { ok: true, stripeSyncStatus: syncStatus };
}

export async function reactivateClinic(
  input: ReactivateClinicInput,
): Promise<AccountStatusResult> {
  const { clinicId, actor, request } = input;
  const admin = createAdminClient();

  const clinic = await loadClinicBilling(admin, clinicId);
  if (!clinic) return { ok: false, error: "Clinic not found." };

  const hasSubscription = !!clinic.stripe_subscription_id;
  let syncStatus: StripeSyncStatus;

  if (isStripeConfigured() && hasSubscription) {
    const stripe = await resumeSubscription(
      clinic.stripe_subscription_id as string,
    );
    if (!stripe.ok) {
      await admin
        .from("clinics")
        .update({
          stripe_sync_status: "sync_failed",
          stripe_last_synced_at: new Date().toISOString(),
        })
        .eq("id", clinicId);
      captureOwnerConsoleException(
        new Error("stripe.resume failed during clinic reactivate"),
        "clinic.reactivate",
        { clinicId, errorCode: stripe.errorCode },
      );
      await writeAdminAuditLog({
        actor,
        action: "clinic.reactivate",
        targetType: "clinic",
        targetId: clinicId,
        targetClinicId: clinicId,
        metadata: { outcome: "stripe_failed", errorCode: stripe.errorCode },
        request,
      });
      return {
        ok: false,
        error: "Could not resume billing; the clinic was NOT reactivated.",
        stripeSyncStatus: "sync_failed",
      };
    }
    syncStatus = "synced";
  } else if (isStripeConfigured() && !hasSubscription) {
    syncStatus = "not_applicable";
  } else {
    syncStatus = "not_configured";
  }

  const { error: updateError } = await admin
    .from("clinics")
    .update({
      account_status: "active",
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
      stripe_sync_status: syncStatus,
      stripe_last_synced_at:
        syncStatus === "synced" ? new Date().toISOString() : null,
    })
    .eq("id", clinicId);

  if (updateError) {
    captureOwnerConsoleException(
      new Error("clinics.update failed during reactivate"),
      "clinic.reactivate",
      { clinicId, code: updateError.code },
    );
    return { ok: false, error: "Could not reactivate the clinic. Try again." };
  }

  await writeAdminAuditLog({
    actor,
    action: "clinic.reactivate",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: { outcome: "reactivated", stripeSyncStatus: syncStatus },
    request,
  });

  return { ok: true, stripeSyncStatus: syncStatus };
}
