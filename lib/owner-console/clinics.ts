/**
 * Owner-console clinic read layer. SERVER-ONLY; callers MUST have passed
 * requireOwnerConsoleAccess() first. Uses the service role to read across all
 * tenants.
 *
 * PHI DISCIPLINE: never returns patient names, patient emails, audiometric
 * values, or any clinical content. Support data is operational only (counts,
 * masked email-delivery status, kiosk-link lifecycle, audit trail).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements, type Entitlements } from "./entitlements";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ClinicListRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  accountStatus: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  lastActivityAt: string | null;
}

export interface ClinicListResult {
  rows: ClinicListRow[];
  total: number;
  page: number;
  pageSize: number;
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** Resolve owner emails (auth.users) for a set of clinics via their owner
 *  profile rows. Bounded by page size. */
async function resolveOwnerEmails(
  admin: AdminClient,
  clinicIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (clinicIds.length === 0) return result;

  const { data: owners } = await admin
    .from("profiles")
    .select("id, clinic_id, role")
    .in("clinic_id", clinicIds)
    .eq("role", "owner");

  for (const o of (owners ?? []) as { id: string; clinic_id: string }[]) {
    if (result.has(o.clinic_id)) continue;
    try {
      const { data } = await admin.auth.admin.getUserById(o.id);
      if (data?.user?.email) result.set(o.clinic_id, data.user.email);
    } catch {
      /* leave unresolved */
    }
  }
  return result;
}

async function resolveLastActivity(
  admin: AdminClient,
  clinicIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (clinicIds.length === 0) return result;
  const { data } = await admin
    .from("consults")
    .select("clinic_id, created_at")
    .in("clinic_id", clinicIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  for (const row of (data ?? []) as { clinic_id: string; created_at: string }[]) {
    if (!result.has(row.clinic_id)) result.set(row.clinic_id, row.created_at);
  }
  return result;
}

export async function listClinics(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ClinicListResult> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const search = params.search?.trim();

  // Email search: resolve to a clinic_id via the matching user's owner profile.
  let emailClinicFilter: string | null | undefined;
  if (search && search.includes("@")) {
    emailClinicFilter = await clinicIdForOwnerEmail(admin, search);
    if (!emailClinicFilter) {
      return { rows: [], total: 0, page, pageSize };
    }
  }

  // Apply filters first (filter builder), then transforms (order/range).
  let query = admin
    .from("clinics")
    .select(
      "id, name, account_status, subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id, created_at",
      { count: "exact" },
    );

  if (emailClinicFilter) {
    query = query.eq("id", emailClinicFilter);
  } else if (search && UUID_RE.test(search)) {
    query = query.eq("id", search);
  } else if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) return { rows: [], total: 0, page, pageSize };

  const clinics = (data ?? []) as Array<{
    id: string;
    name: string;
    account_status: string;
    subscription_plan: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
  }>;
  const ids = clinics.map((c) => c.id);
  const [ownerEmails, lastActivity] = await Promise.all([
    resolveOwnerEmails(admin, ids),
    resolveLastActivity(admin, ids),
  ]);

  return {
    rows: clinics.map((c) => ({
      id: c.id,
      name: c.name,
      ownerEmail: ownerEmails.get(c.id) ?? null,
      accountStatus: c.account_status,
      subscriptionPlan: c.subscription_plan,
      subscriptionStatus: c.subscription_status,
      stripeCustomerId: c.stripe_customer_id,
      stripeSubscriptionId: c.stripe_subscription_id,
      createdAt: c.created_at,
      lastActivityAt: lastActivity.get(c.id) ?? null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

async function clinicIdForOwnerEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const user = data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
  if (!user) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();
  return (profile?.clinic_id as string | null) ?? null;
}

export interface ClinicDetail {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  accountStatus: string;
  suspendedAt: string | null;
  suspensionReason: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSyncStatus: string;
  stripeLastSyncedAt: string | null;
  createdAt: string;
  entitlements: Entitlements;
}

export async function getClinicDetail(clinicId: string): Promise<ClinicDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinics")
    .select(
      "id, name, slug, account_status, suspended_at, suspension_reason, subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id, stripe_sync_status, stripe_last_synced_at, created_at",
    )
    .eq("id", clinicId)
    .maybeSingle();
  if (!data) return null;

  const ownerEmails = await resolveOwnerEmails(admin, [clinicId]);
  const entitlements = await getEntitlements(clinicId);

  const c = data as Record<string, unknown>;
  return {
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    ownerEmail: ownerEmails.get(clinicId) ?? null,
    accountStatus: c.account_status as string,
    suspendedAt: (c.suspended_at as string | null) ?? null,
    suspensionReason: (c.suspension_reason as string | null) ?? null,
    subscriptionPlan: c.subscription_plan as string,
    subscriptionStatus: c.subscription_status as string,
    stripeCustomerId: (c.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (c.stripe_subscription_id as string | null) ?? null,
    stripeSyncStatus: (c.stripe_sync_status as string) ?? "not_configured",
    stripeLastSyncedAt: (c.stripe_last_synced_at as string | null) ?? null,
    createdAt: c.created_at as string,
    entitlements,
  };
}

export interface ClinicSupportSnapshot {
  userCount: number;
  locationCount: number;
  recentConsultCount: number; // last 30 days; NO patient detail
  recentEmails: Array<{
    id: string;
    maskedRecipient: string | null;
    status: string;
    template: string | null;
    providerMessageId: string | null;
    createdAt: string;
  }>;
  recentKioskSessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    usedAt: string | null;
    revokedAt: string | null;
  }>;
}

export async function getClinicSupportSnapshot(
  clinicId: string,
): Promise<ClinicSupportSnapshot> {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

  const [users, locations, consults, emails, kiosks] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    admin.from("locations").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    admin
      .from("consults")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gt("created_at", thirtyDaysAgo),
    admin
      .from("email_logs")
      .select("id, recipient_email_masked, status, template, provider_message_id, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("intake_links")
      .select("id, created_at, expires_at, used_at, revoked_at")
      .eq("clinic_id", clinicId)
      .eq("mode", "kiosk")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    userCount: users.count ?? 0,
    locationCount: locations.count ?? 0,
    recentConsultCount: consults.count ?? 0,
    recentEmails: ((emails.data ?? []) as Record<string, unknown>[]).map((e) => ({
      id: e.id as string,
      maskedRecipient: (e.recipient_email_masked as string | null) ?? null,
      status: e.status as string,
      template: (e.template as string | null) ?? null,
      providerMessageId: (e.provider_message_id as string | null) ?? null,
      createdAt: e.created_at as string,
    })),
    recentKioskSessions: ((kiosks.data ?? []) as Record<string, unknown>[]).map((k) => ({
      id: k.id as string,
      createdAt: k.created_at as string,
      expiresAt: k.expires_at as string,
      usedAt: (k.used_at as string | null) ?? null,
      revokedAt: (k.revoked_at as string | null) ?? null,
    })),
  };
}

export interface AuditTimelineRow {
  id: string;
  action: string;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function getClinicAuditTimeline(
  clinicId: string,
  limit = 25,
): Promise<AuditTimelineRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_logs")
    .select("id, action, actor_email, actor_console_role, target_type, target_id, metadata, created_at")
    .eq("target_clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return mapAuditRows(data);
}

export async function getRecentAuditLogs(limit = 50): Promise<AuditTimelineRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_audit_logs")
    .select("id, action, actor_email, actor_console_role, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return mapAuditRows(data);
}

function mapAuditRows(data: unknown): AuditTimelineRow[] {
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    action: r.action as string,
    actorEmail: (r.actor_email as string | null) ?? null,
    actorRole: (r.actor_console_role as string | null) ?? null,
    targetType: r.target_type as string,
    targetId: (r.target_id as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
  }));
}

export interface ClinicStats {
  totalClinics: number;
  activeClinics: number;
  suspendedClinics: number;
  subscriptionCounts: Record<string, number>;
}

export async function getClinicStats(): Promise<ClinicStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clinics")
    .select("account_status, subscription_status");

  const rows = (data ?? []) as Array<{
    account_status: string;
    subscription_status: string;
  }>;
  const subscriptionCounts: Record<string, number> = {
    trialing: 0,
    active: 0,
    past_due: 0,
    canceled: 0,
  };
  let active = 0;
  let suspended = 0;
  for (const r of rows) {
    if (r.account_status === "suspended") suspended += 1;
    else active += 1;
    subscriptionCounts[r.subscription_status] =
      (subscriptionCounts[r.subscription_status] ?? 0) + 1;
  }
  return {
    totalClinics: rows.length,
    activeClinics: active,
    suspendedClinics: suspended,
    subscriptionCounts,
  };
}
