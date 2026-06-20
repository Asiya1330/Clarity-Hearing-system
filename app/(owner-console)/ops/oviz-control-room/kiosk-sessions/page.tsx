import { Suspense } from "react";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { listActiveKioskSessions } from "@/lib/owner-console/kiosk";
import { KioskRevokeButton } from "@/components/owner-console/kiosk-revoke-button";
import {
  EmptyState,
  PageHeading,
  Panel,
  formatDateTime,
} from "@/components/owner-console/console-ui";

export default function KioskSessionsPage() {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading kiosk sessions…</p>}>
      <KioskSessionsBody />
    </Suspense>
  );
}

async function KioskSessionsBody() {
  await requireOwnerConsoleAccess();
  const sessions = await listActiveKioskSessions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Kiosk sessions"
        description="Active kiosk intake links (unused, unexpired, not revoked). Force-kill invalidates the patient link immediately."
      />
      <Panel>
        {sessions.length === 0 ? (
          <EmptyState message="No active kiosk sessions." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line text-left text-brand-muted">
                  <th className="py-2 pr-4 font-semibold">Clinic</th>
                  <th className="py-2 pr-4 font-semibold">Created</th>
                  <th className="py-2 pr-4 font-semibold">Expires</th>
                  <th className="py-2 pr-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-brand-line/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-brand-navy">{s.clinicName}</td>
                    <td className="py-2 pr-4 text-brand-muted">{formatDateTime(s.createdAt)}</td>
                    <td className="py-2 pr-4 text-brand-muted">{formatDateTime(s.expiresAt)}</td>
                    <td className="py-2 pr-4 text-right">
                      <KioskRevokeButton linkId={s.id} />
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
