import { Suspense } from "react";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { getRecentAuditLogs } from "@/lib/owner-console/clinics";
import {
  EmptyState,
  PageHeading,
  Panel,
  formatDateTime,
} from "@/components/owner-console/console-ui";

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading audit log…</p>}>
      <AuditBody />
    </Suspense>
  );
}

async function AuditBody() {
  await requireOwnerConsoleAccess();
  const rows = await getRecentAuditLogs(200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Audit logs"
        description="Immutable, append-only record of every owner-console action."
      />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState message="No console activity recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-brand-muted">
                  <th className="py-2 pr-4 font-semibold">When</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Actor</th>
                  <th className="py-2 pr-4 font-semibold">Role</th>
                  <th className="py-2 pr-4 font-semibold">Target</th>
                  <th className="py-2 pr-4 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brand-line/60 align-top last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-brand-muted">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="py-2 pr-4 font-medium text-brand-navy">{r.action}</td>
                    <td className="py-2 pr-4 text-brand-muted">{r.actorEmail ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-muted">{r.actorRole ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-muted">
                      {r.targetType}
                      {r.targetId ? ` · ${r.targetId.slice(0, 8)}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-xs text-brand-muted">
                      {Object.keys(r.metadata).length > 0
                        ? JSON.stringify(r.metadata)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
