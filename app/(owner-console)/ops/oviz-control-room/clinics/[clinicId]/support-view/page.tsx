import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import {
  getClinicDetail,
  getClinicSupportSnapshot,
} from "@/lib/owner-console/clinics";
import { OWNER_CONSOLE_ROOT_PATH } from "@/lib/owner-console/constants";
import { SupportViewTracker } from "@/components/owner-console/support-view-tracker";
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

export default function SupportViewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading support view…</p>}>
      <SupportViewBody params={params} />
    </Suspense>
  );
}

async function SupportViewBody({ params }: PageProps) {
  const ctx = await requireOwnerConsoleAccess();
  const { clinicId } = await params;

  const detail = await getClinicDetail(clinicId);
  if (!detail) notFound();
  const snapshot = await getClinicSupportSnapshot(clinicId);
  const isSuper = ctx.role === "super_admin";

  return (
    <div className="flex flex-col gap-6">
      <SupportViewTracker clinicId={clinicId} />

      <div
        role="alert"
        className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900"
      >
        <p className="font-semibold">
          Support view: you are viewing this clinic as an administrator.
        </p>
        <p className="text-sm">
          All actions are logged. Clinical edits are disabled. No patient names,
          contact details, or diagnostic values are shown.
        </p>
      </div>

      <PageHeading
        title={`Support — ${detail.name}`}
        description={detail.ownerEmail ?? "no owner email"}
        actions={
          <Link
            href={`${OWNER_CONSOLE_ROOT_PATH}/clinics/${clinicId}`}
            className="rounded-lg border border-brand-line px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist"
          >
            Exit support view
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Account" value={<StatusPill status={detail.accountStatus} />} />
        <StatCard label="Plan" value={<span className="capitalize">{detail.subscriptionPlan}</span>} />
        <StatCard label="Users" value={snapshot.userCount} />
        <StatCard label="Locations" value={snapshot.locationCount} />
      </div>

      <Panel title="Operational summary">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="Subscription" value={detail.subscriptionStatus} />
          <Row label="Created" value={formatDate(detail.createdAt)} />
          <Row label="Consults (30d)" value={String(snapshot.recentConsultCount)} />
          <Row label="Stripe sync" value={detail.stripeSyncStatus} />
          {isSuper && (
            <>
              <Row label="Stripe customer" value={detail.stripeCustomerId ?? "—"} />
              <Row label="Stripe subscription" value={detail.stripeSubscriptionId ?? "—"} />
            </>
          )}
        </dl>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent email delivery (masked)">
          {snapshot.recentEmails.length === 0 ? (
            <EmptyState message="No email activity." />
          ) : (
            <ul className="flex flex-col gap-1 text-xs">
              {snapshot.recentEmails.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="text-brand-muted">
                    {e.maskedRecipient ?? "—"} · {formatDateTime(e.createdAt)}
                  </span>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent kiosk sessions">
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
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-brand-muted">{label}</dt>
      <dd className="font-medium text-brand-navy">{value}</dd>
    </>
  );
}
