/**
 * Minimal, server-only Stripe wrapper for owner-console billing actions.
 *
 * The project does NOT depend on the `stripe` npm package, and we deliberately
 * avoid adding it. Instead we call the stable Stripe REST API directly with
 * fetch + the secret key. This keeps the dependency surface unchanged and the
 * secret strictly server-side.
 *
 * SECURITY:
 *   - STRIPE_SECRET_KEY is read here only; never returned, logged, or sent to
 *     the client.
 *   - We never log raw Stripe response bodies (they can carry customer PII).
 *     Only the subscription id, resulting status, and a non-PII error code are
 *     surfaced.
 *   - Every action is gated by isStripeConfigured(); callers render a clear
 *     "billing not configured" state when it returns false.
 *
 * API NOTES (verified against the long-stable Stripe REST surface):
 *   - Pause collection (reversible suspension): POST /v1/subscriptions/{id}
 *     with pause_collection[behavior]=void.
 *   - Resume: POST /v1/subscriptions/{id} with pause_collection= (empty unsets).
 *   - Extend trial: POST /v1/subscriptions/{id} with trial_end=<unix> and
 *     proration_behavior=none.
 *   - Apply coupon: POST /v1/subscriptions/{id} with coupon=<id>. NOTE: very
 *     recent pinned API versions move this under `discounts[]`; the long-stable
 *     `coupon` field is used here for broad compatibility. If your account is
 *     pinned to a version that rejects `coupon`, switch to discounts[0][coupon]
 *     — failures are surfaced (errorCode), never silent. See
 *     OWNER_CONSOLE_IMPLEMENTATION_REPORT.md.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export interface StripeResult {
  ok: boolean;
  id?: string;
  /** Resulting subscription status (e.g. active, paused, trialing). */
  status?: string;
  /** Non-PII Stripe error code/type, safe to log/audit. */
  errorCode?: string;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function dashboardMode(): "live" | "test" {
  return process.env.STRIPE_DASHBOARD_MODE === "test" ? "test" : "live";
}

function dashboardBase(): string {
  return dashboardMode() === "test"
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}

export function stripeDashboardCustomerUrl(customerId: string): string {
  return `${dashboardBase()}/customers/${encodeURIComponent(customerId)}`;
}

export function stripeDashboardSubscriptionUrl(subscriptionId: string): string {
  return `${dashboardBase()}/subscriptions/${encodeURIComponent(subscriptionId)}`;
}

/**
 * Low-level form-encoded Stripe REST call. Returns a structured result; never
 * throws on HTTP/Stripe errors (they become ok:false with a safe errorCode).
 */
async function stripeRequest(
  path: string,
  params: Record<string, string>,
): Promise<StripeResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, errorCode: "not_configured" };

  let res: Response;
  try {
    res = await fetch(`${STRIPE_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch {
    return { ok: false, errorCode: "network_error" };
  }

  // Parse defensively; do not surface the raw body (may contain PII).
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  const body = (json ?? {}) as {
    id?: string;
    status?: string;
    error?: { code?: string; type?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      errorCode: body.error?.code ?? body.error?.type ?? `http_${res.status}`,
    };
  }
  return { ok: true, id: body.id, status: body.status };
}

/** Pause collection on a subscription (reversible) for a clinic suspension. */
export function pauseOrCancelSubscriptionForSuspension(
  subscriptionId: string,
): Promise<StripeResult> {
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    "pause_collection[behavior]": "void",
  });
}

/** Resume a paused subscription. Empty value unsets pause_collection. */
export function resumeSubscription(
  subscriptionId: string,
): Promise<StripeResult> {
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    pause_collection: "",
  });
}

/** Extend (or set) the trial end to `days` from now, with no proration. */
export function extendTrial(
  subscriptionId: string,
  days: number,
): Promise<StripeResult> {
  const trialEnd = Math.floor(Date.now() / 1000) + Math.round(days) * 86400;
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    trial_end: String(trialEnd),
    proration_behavior: "none",
  });
}

/** Apply a retention coupon to a subscription. */
export function applyCoupon(
  subscriptionId: string,
  couponId: string,
): Promise<StripeResult> {
  return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    coupon: couponId,
  });
}
