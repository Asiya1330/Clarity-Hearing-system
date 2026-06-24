/**
 * Owner-console billing actions (Stripe). SERVER-ONLY, super_admin only
 * (enforced by the calling route). Every action is gated by isStripeConfigured()
 * and a present subscription id; otherwise it returns a clear disabled message
 * and changes nothing. All outcomes are audited and the clinic's
 * stripe_sync_status is kept consistent.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";
import {
  applyCoupon,
  extendTrial,
  isStripeConfigured,
  type StripeResult,
} from "./stripe";

export interface BillingActionResult {
  ok: boolean;
  error?: string;
}

async function loadSubscriptionId(
  admin: ReturnType<typeof createAdminClient>,
  clinicId: string,
): Promise<{ found: boolean; subscriptionId: string | null }> {
  const { data } = await admin
    .from("clinics")
    .select("id, stripe_subscription_id")
    .eq("id", clinicId)
    .maybeSingle();
  if (!data) return { found: false, subscriptionId: null };
  return { found: true, subscriptionId: (data.stripe_subscription_id as string | null) ?? null };
}

async function recordSync(
  admin: ReturnType<typeof createAdminClient>,
  clinicId: string,
  ok: boolean,
) {
  await admin
    .from("clinics")
    .update({
      stripe_sync_status: ok ? "synced" : "sync_failed",
      stripe_last_synced_at: new Date().toISOString(),
    })
    .eq("id", clinicId);
}

export async function extendTrialForClinic(input: {
  clinicId: string;
  days: number;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<BillingActionResult> {
  const { clinicId, days, actor, request } = input;
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured." };
  }
  const admin = createAdminClient();
  const { found, subscriptionId } = await loadSubscriptionId(admin, clinicId);
  if (!found) return { ok: false, error: "Clinic not found." };
  if (!subscriptionId) {
    return { ok: false, error: "This clinic has no Stripe subscription." };
  }

  let result: StripeResult;
  try {
    result = await extendTrial(subscriptionId, days);
  } catch (error) {
    captureOwnerConsoleException(error, "stripe.trial_extend", { clinicId });
    return { ok: false, error: "Billing request failed." };
  }
  await recordSync(admin, clinicId, result.ok);

  await writeAdminAuditLog({
    actor,
    action: "stripe.trial_extend",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: { days, ok: result.ok, errorCode: result.errorCode },
    request,
  });

  return result.ok
    ? { ok: true }
    : { ok: false, error: "Stripe rejected the request." };
}

export async function applyCouponForClinic(input: {
  clinicId: string;
  couponId?: string;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<BillingActionResult> {
  const { clinicId, actor, request } = input;
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured." };
  }
  const couponId = input.couponId ?? process.env.STRIPE_RETENTION_COUPON_ID;
  if (!couponId) {
    return { ok: false, error: "No retention coupon is configured." };
  }
  const admin = createAdminClient();
  const { found, subscriptionId } = await loadSubscriptionId(admin, clinicId);
  if (!found) return { ok: false, error: "Clinic not found." };
  if (!subscriptionId) {
    return { ok: false, error: "This clinic has no Stripe subscription." };
  }

  let result: StripeResult;
  try {
    result = await applyCoupon(subscriptionId, couponId);
  } catch (error) {
    captureOwnerConsoleException(error, "stripe.coupon_apply", { clinicId });
    return { ok: false, error: "Billing request failed." };
  }
  await recordSync(admin, clinicId, result.ok);

  await writeAdminAuditLog({
    actor,
    action: "stripe.coupon_apply",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: { ok: result.ok, errorCode: result.errorCode },
    request,
  });

  return result.ok
    ? { ok: true }
    : { ok: false, error: "Stripe rejected the coupon." };
}
