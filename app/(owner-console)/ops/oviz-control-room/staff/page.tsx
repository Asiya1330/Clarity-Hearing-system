import { Suspense } from "react";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import { listConsoleStaff } from "@/lib/owner-console/staff";
import { StaffManager } from "@/components/owner-console/staff-manager";
import { PageHeading, Panel } from "@/components/owner-console/console-ui";

export default function StaffPage() {
  return (
    <Suspense fallback={<p className="text-brand-muted">Loading staff…</p>}>
      <StaffBody />
    </Suspense>
  );
}

async function StaffBody() {
  const ctx = await requireOwnerConsoleAccess();
  const staff = await listConsoleStaff();
  const canManage = ctx.role === "super_admin";

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Console staff"
        description={
          canManage
            ? "Invite, promote, or revoke owner-console staff. The owner account is protected."
            : "Read-only. Only a super-admin can manage staff."
        }
      />
      <Panel>
        <StaffManager
          staff={staff.map((s) => ({
            userId: s.userId,
            email: s.email,
            role: s.role,
            isOwner: s.isOwner,
            enabled: s.enabled,
          }))}
          canManage={canManage}
          currentUserId={ctx.userId}
        />
      </Panel>
    </div>
  );
}
