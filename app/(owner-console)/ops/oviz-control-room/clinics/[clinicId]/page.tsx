import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import {
  getClinicAuditTimeline,
  getClinicDetail,
  getClinicSupportSnapshot,
} from "@/lib/owner-console/clinics";
import {
  stripeDashboardCustomerUrl,
  stripeDashboardSubscriptionUrl,
  isStripeConfigured,
} from "@/lib/owner-console/stripe";
import { isResendConfigured } from "@/lib/email/resend";
import { OWNER_CONSOLE_ROOT_PATH } from "@/lib/owner-console/constants";
import { ClinicActions } from "@/components/owner-console/clinic-actions";
import {
  EmptyState,
  PageHeading,
  Panel,
  StatCard,
  StatusPill,
  formatDate,
  formatDateTime,
} from "@/components/owner-console/console-ui";

interface PageProps {
  params: Promise<{ clinicId: string }>;
}

export default function ClinicDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading clinic…</p>}>
      <ClinicDetailBody params={params} />
    </Suspense>
  );
}

async function ClinicDetailBody({ params }: PageProps) {
  const ctx = await requireOwnerConsoleAccess();
  const { clinicId } = await params;

  const detail = await getClinicDetail(clinicId);
  if (!detail) notFound();

  const [snapshot, timeline] = await Promise.all([
    getClinicSupportSnapshot(clinicId),
    getClinicAuditTimeline(clinicId, 25),
  ]);

  const base = `${OWNER_CONSOLE_ROOT_PATH}/clinics`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={base} className="text-sm text-brand-muted hover:underline">
          ← All clinics
        </Link>
      </div>
      <PageHeading
        title={detail.name}
        description={`${detail.ownerEmail ?? "no owner email"} · created ${formatDate(detail.createdAt)}`}
        actions={
          <Link
            href={`${base}/${clinicId}/support-view`}
            className="rounded-lg border border-brand-line px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist"
          >
            Support view
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Account" value={<StatusPill status={detail.accountStatus} />} />
        <StatCard label="Plan" value={<span className="capitalize">{detail.subscriptionPlan}</span>} />
        <StatCard label="Subscription" value={<StatusPill status={detail.subscriptionStatus} />} />
        <StatCard label="Stripe sync" value={<StatusPill status={detail.stripeSyncStatus} />} />
      </div>

      {detail.accountStatus === "suspended" && (
        <Panel className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-900">
            <strong>Suspended</strong> {formatDateTime(detail.suspendedAt)} ·{" "}
            {detail.suspensionReason ?? "no reason recorded"}
          </p>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Panel title="Stripe">
            {detail.stripeCustomerId || detail.stripeSubscriptionId ? (
              <ul className="flex flex-col gap-2 text-sm">
                {detail.stripeCustomerId && (
                  <li>
                    <a
                      href={stripeDashboardCustomerUrl(detail.stripeCustomerId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal-700 hover:underline"
                    >
                      Customer in Stripe ↗
                    </a>
                  </li>
                )}
                {detail.stripeSubscriptionId && (
                  <li>
                    <a
                      href={stripeDashboardSubscriptionUrl(detail.stripeSubscriptionId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal-700 hover:underline"
                    >
                      Subscription in Stripe ↗
                    </a>
                  </li>
                )}
                <li className="text-xs text-brand-muted">
                  Last synced: {formatDateTime(detail.stripeLastSyncedAt)}
                </li>
              </ul>
            ) : (
              <p className="text-sm text-brand-muted">No Stripe identifiers on file.</p>
            )}
          </Panel>

          <Panel title="Support snapshot">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Users" value={snapshot.userCount} />
              <StatCard label="Locations" value={snapshot.locationCount} />
              <StatCard label="Consults (30d)" value={snapshot.recentConsultCount} />
            </div>
            <p className="mt-3 text-xs text-brand-muted">
              No patient names or clinical values are shown anywhere in the console.
            </p>

            <h3 className="mt-5 mb-2 text-sm font-semibold text-brand-navy">
              Latest email delivery
            </h3>
            {snapshot.recentEmails.length === 0 ? (
              <EmptyState message="No email activity." />
            ) : (
              <ul className="flex flex-col gap-1 text-xs">
                {snapshot.recentEmails.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="text-brand-muted">
                      {e.maskedRecipient ?? "—"} · {e.template ?? "—"}
                    </span>
                    <StatusPill status={e.status} />
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-5 mb-2 text-sm font-semibold text-brand-navy">
              Latest kiosk sessions
            </h3>
            {snapshot.recentKioskSessions.length === 0 ? (
              <EmptyState message="No kiosk sessions." />
            ) : (
              <ul className="flex flex-col gap-1 text-xs text-brand-muted">
                {snapshot.recentKioskSessions.map((k) => (
                  <li key={k.id}>
                    {formatDateTime(k.createdAt)} · expires {formatDateTime(k.expiresAt)}
                    {k.usedAt ? " · used" : ""}
                    {k.revokedAt ? " · revoked" : ""}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Audit timeline">
            {timeline.length === 0 ? (
              <EmptyState message="No console actions for this clinic." />
            ) : (
              <ul className="flex flex-col gap-2 text-xs">
                {timeline.map((t) => (
                  <li key={t.id} className="border-b border-brand-line/60 pb-2 last:border-0">
                    <span className="text-brand-muted">{formatDateTime(t.createdAt)}</span>{" "}
                    <span className="font-medium text-brand-navy">{t.action}</span>{" "}
                    <span className="text-brand-muted">by {t.actorEmail ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <ClinicActions
          clinicId={clinicId}
          clinicName={detail.name}
          accountStatus={detail.accountStatus}
          isSuperAdmin={ctx.role === "super_admin"}
          stripeConfigured={isStripeConfigured()}
          hasSubscription={!!detail.stripeSubscriptionId}
          retentionCouponConfigured={!!process.env.STRIPE_RETENTION_COUPON_ID}
          resendConfigured={isResendConfigured()}
          entitlements={{
            enable_kiosk_mode: detail.entitlements.enable_kiosk_mode,
            enable_presentation_mode: detail.entitlements.enable_presentation_mode,
            enable_audiogram_ai_beta: detail.entitlements.enable_audiogram_ai_beta,
            notes: detail.entitlements.notes,
          }}
        />
      </div>
    </div>
  );
}
