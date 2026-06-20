import { Suspense } from "react";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { getConfigChecks } from "@/lib/owner-console/config-status";
import { checkDatabase } from "@/lib/owner-console/health";
import {
  ConfigDot,
  PageHeading,
  Panel,
  StatCard,
} from "@/components/owner-console/console-ui";

export default function HealthPage() {
  return (
    <Suspense fallback={<p className="text-brand-muted">Running health checks…</p>}>
      <HealthBody />
    </Suspense>
  );
}

async function HealthBody() {
  await requireOwnerConsoleAccess();
  const [db, checks] = await Promise.all([checkDatabase(), Promise.resolve(getConfigChecks())]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="System health"
        description="Connectivity and configuration. Secret values are never displayed — only configured / missing."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Database"
          value={db.ok ? "Connected" : "Unreachable"}
          hint={`${db.latencyMs} ms`}
        />
      </div>

      <Panel title="Environment configuration">
        <ul className="flex flex-col divide-y divide-brand-line">
          {checks.map((c) => (
            <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium text-brand-navy">{c.label}</p>
                <p className="font-mono text-xs text-brand-muted">{c.key}</p>
                {c.warning && (
                  <p className="mt-1 text-xs text-amber-800">{c.warning}</p>
                )}
              </div>
              <ConfigDot configured={c.configured} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
