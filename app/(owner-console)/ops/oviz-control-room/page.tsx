import { Suspense } from "react";
import Link from "next/link";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { getClinicStats, getRecentAuditLogs } from "@/lib/owner-console/clinics";
import { getConfigChecks, getIntegrationStatus } from "@/lib/owner-console/config-status";
import { checkDatabase } from "@/lib/owner-console/health";
import { OWNER_CONSOLE_ROOT_PATH } from "@/lib/owner-console/constants";
import {
  ConfigDot,
  EmptyState,
  PageHeading,
  Panel,
  StatCard,
  StatusPill,
  formatDateTime,
} from "@/components/owner-console/console-ui";

export default function OverviewPage() {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading overview…</p>}>
      <OverviewBody />
    </Suspense>
  );
}

async function OverviewBody() {
  await requireOwnerConsoleAccess();

  const [stats, recent, db] = await Promise.all([
    getClinicStats(),
    getRecentAuditLogs(12),
    checkDatabase(),
  ]);
  const integrations = getIntegrationStatus();
  const configChecks = getConfigChecks();
  const warnings = configChecks.filter((c) => c.warning);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Overview"
        description="Tenant health, integrations, and recent administrative activity."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clinics" value={stats.totalClinics} />
        <StatCard label="Active" value={stats.activeClinics} />
        <StatCard label="Suspended" value={stats.suspendedClinics} />
        <StatCard
          label="Database"
          value={db.ok ? "Up" : "Down"}
          hint={`${db.latencyMs} ms`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Trialing" value={stats.subscriptionCounts.trialing ?? 0} />
        <StatCard label="Active subs" value={stats.subscriptionCounts.active ?? 0} />
        <StatCard label="Past due" value={stats.subscriptionCounts.past_due ?? 0} />
        <StatCard label="Canceled" value={stats.subscriptionCounts.canceled ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Integrations">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-brand-navy">Resend (email)</span>
              <ConfigDot configured={integrations.resendConfigured} />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-brand-navy">Stripe (billing)</span>
              <ConfigDot configured={integrations.stripeConfigured} />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-brand-navy">Sentry (monitoring)</span>
              <ConfigDot configured={integrations.sentryConfigured} />
            </li>
          </ul>
        </Panel>

        <Panel title="Environment warnings">
          {integrations.usingLegacyServiceRoleKey && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Service-role key is using the deprecated{" "}
              <code>NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY</code> fallback. Migrate
              the Vercel env var to <code>SUPABASE_SERVICE_ROLE_KEY</code>.
            </p>
          )}
          {warnings.length === 0 && !integrations.usingLegacyServiceRoleKey ? (
            <p className="text-sm text-brand-muted">No environment warnings.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm text-amber-900">
              {warnings.map((w) => (
                <li key={w.key} className="rounded-lg bg-amber-50 px-3 py-2">
                  <span className="font-semibold">{w.label}:</span> {w.warning}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent administrative activity">
        {recent.length === 0 ? (
          <EmptyState message="No console activity recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-brand-muted">
                  <th className="py-2 pr-4 font-semibold">When</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Actor</th>
                  <th className="py-2 pr-4 font-semibold">Target</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-brand-line/60 last:border-0">
                    <td className="py-2 pr-4 text-brand-muted">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2 pr-4 font-medium text-brand-navy">{r.action}</td>
                    <td className="py-2 pr-4 text-brand-muted">{r.actorEmail ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-muted">
                      {r.targetType}
                      {r.targetId ? ` · ${r.targetId.slice(0, 8)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Link
            href={`${OWNER_CONSOLE_ROOT_PATH}/audit`}
            className="text-sm font-medium text-brand-teal-700 hover:underline"
          >
            View full audit log →
          </Link>
        </div>
      </Panel>

      <p className="text-xs text-brand-muted">
        <StatusPill status="active" /> tenants are billable and operational;{" "}
        <StatusPill status="suspended" /> tenants are blocked from the app.
      </p>
    </div>
  );
}
