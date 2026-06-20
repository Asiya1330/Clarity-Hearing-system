"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/form-error";
import { OWNER_CONSOLE_API_PREFIX } from "@/lib/owner-console/constants";

export interface StaffRowVM {
  userId: string;
  email: string;
  role: "owner" | "super_admin" | "sub_admin";
  isOwner: boolean;
  enabled: boolean;
}

export function StaffManager({
  staff,
  canManage,
  currentUserId,
}: {
  staff: StaffRowVM[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const post = async (url: string, body?: Record<string, unknown>) => {
    setError(null);
    setNotice(null);
    const res = await fetch(`${OWNER_CONSOLE_API_PREFIX}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      claimsStale?: boolean;
      mode?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Action failed.");
      return false;
    }
    if (data.claimsStale) {
      setNotice(
        "Saved. The affected user must sign out and back in for the change to take effect.",
      );
    }
    router.refresh();
    return true;
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("invite");
    const ok = await post("/staff/invite", { email: inviteEmail });
    if (ok) setInviteEmail("");
    setBusy(null);
  };

  const revoke = async (userId: string) => {
    if (!confirm("Revoke this staff member's console access?")) return;
    setBusy(userId);
    await post(`/staff/${userId}/revoke`);
    setBusy(null);
  };

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId);
    await post(`/staff/${userId}/role`, { role });
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <form
          onSubmit={invite}
          className="flex flex-col gap-3 rounded-xl border border-brand-line bg-brand-mist/30 p-4"
        >
          <Label htmlFor="invite-email" className="text-sm text-brand-navy">
            Invite or promote a staff member (sub-admin)
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="invite-email"
              type="email"
              placeholder="person@example.com"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" size="sm" disabled={busy === "invite"}>
              {busy === "invite" ? "Working…" : "Grant access"}
            </Button>
          </div>
          <p className="text-xs text-brand-muted">
            Existing accounts are promoted immediately; new emails receive an
            invitation if Supabase email is configured.
          </p>
        </form>
      )}

      {error && <FormError message={error} />}
      {notice && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{notice}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-line text-left text-brand-muted">
              <th className="py-2 pr-4 font-semibold">Email</th>
              <th className="py-2 pr-4 font-semibold">Role</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
              {canManage && <th className="py-2 pr-4 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const isSelf = s.userId === currentUserId;
              const locked = s.isOwner;
              return (
                <tr key={s.userId} className="border-b border-brand-line/60 last:border-0">
                  <td className="py-2 pr-4 font-medium text-brand-navy">{s.email}</td>
                  <td className="py-2 pr-4 text-brand-muted">
                    {locked ? "Owner" : s.role}
                  </td>
                  <td className="py-2 pr-4 text-brand-muted">
                    {s.enabled ? "Enabled" : "Revoked"}
                  </td>
                  {canManage && (
                    <td className="py-2 pr-4">
                      {locked ? (
                        <span className="text-xs text-brand-muted">Protected</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="h-8 rounded-md border border-brand-line bg-brand-white px-2 text-xs"
                            value={s.role === "owner" ? "super_admin" : s.role}
                            disabled={busy === s.userId || isSelf}
                            onChange={(e) => changeRole(s.userId, e.target.value)}
                          >
                            <option value="sub_admin">sub_admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy === s.userId || isSelf}
                            onClick={() => revoke(s.userId)}
                          >
                            Revoke
                          </Button>
                          {isSelf && (
                            <span className="text-xs text-brand-muted">(you)</span>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
