/**
 * Owner-console staff management. SERVER-ONLY. Mutations here are super_admin
 * only (enforced by the calling route/action via requireSuperAdmin /
 * authorizeOwnerConsoleApi({ superAdmin: true })).
 *
 * Staff are ordinary Supabase Auth users distinguished solely by app_metadata:
 *   { oviz_console_enabled: true, oviz_console_role: "sub_admin" }
 * The hardcoded owner (sl@evear.ca) is immutable: it can never be revoked,
 * disabled, or demoted by any console action.
 *
 * Because JWT claims embed app_metadata at mint time, an affected user must
 * sign out/in (or wait for a token refresh) before changes take effect — every
 * mutation returns `claimsStale: true` so the UI can say so.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";
import { isHardcodedOwner, normalizeEmail } from "./claims";
import type { OwnerConsoleRole } from "./constants";

export interface ConsoleStaffMember {
  userId: string;
  email: string;
  role: OwnerConsoleRole | "owner";
  isOwner: boolean;
  enabled: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
}

interface AdminUserLike {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
}

function toStaff(u: AdminUserLike): ConsoleStaffMember {
  const owner = isHardcodedOwner({ email: u.email, app_metadata: u.app_metadata });
  const meta = (u.app_metadata as Record<string, unknown> | null) ?? {};
  const rawRole = typeof meta["oviz_console_role"] === "string" ? (meta["oviz_console_role"] as string) : null;
  return {
    userId: u.id,
    email: normalizeEmail(u.email),
    role: owner ? "owner" : ((rawRole as OwnerConsoleRole) ?? "sub_admin"),
    isOwner: owner,
    enabled: owner || meta["oviz_console_enabled"] === true,
    lastSignInAt: u.last_sign_in_at ?? null,
    createdAt: u.created_at ?? null,
  };
}

/** List every console-enabled user (plus the owner). Scans the Admin API user
 *  list; the console staff set is small so a single page is sufficient. */
export async function listConsoleStaff(): Promise<ConsoleStaffMember[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    captureOwnerConsoleException(error, "staff.list");
    return [];
  }
  return (data.users as AdminUserLike[])
    .filter((u) => {
      const meta = (u.app_metadata as Record<string, unknown> | null) ?? {};
      return (
        meta["oviz_console_enabled"] === true ||
        isHardcodedOwner({ email: u.email, app_metadata: u.app_metadata })
      );
    })
    .map(toStaff)
    .sort((a, b) => (a.isOwner === b.isOwner ? a.email.localeCompare(b.email) : a.isOwner ? -1 : 1));
}

async function findUserByEmail(email: string): Promise<AdminUserLike | null> {
  const admin = createAdminClient();
  const target = normalizeEmail(email);
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return (
    (data.users as AdminUserLike[]).find((u) => normalizeEmail(u.email) === target) ?? null
  );
}

export interface StaffMutationResult {
  ok: boolean;
  error?: string;
  claimsStale?: boolean;
  /** How the invite resolved: an existing user promoted, or a new invite sent. */
  mode?: "existing_user_promoted" | "invited";
}

/**
 * Invite (or promote) a staff member to sub_admin. Existing users are promoted
 * via metadata update (always available); a brand-new email is invited via
 * inviteUserByEmail (requires Supabase email/SMTP to be configured — if it is
 * not, a clear error is returned and nothing is changed).
 */
export async function inviteStaff(input: {
  email: string;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<StaffMutationResult> {
  const { email, actor, request } = input;
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  if (normalized === normalizeEmail(actor.email) && actor.role !== "super_admin") {
    return { ok: false, error: "Not permitted." };
  }

  try {
    const existing = await findUserByEmail(normalized);

    if (existing) {
      const meta = (existing.app_metadata as Record<string, unknown> | null) ?? {};
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: { ...meta, oviz_console_enabled: true, oviz_console_role: "sub_admin" },
      });
      if (error) {
        captureOwnerConsoleException(error, "staff.invite", { mode: "promote" });
        return { ok: false, error: "Could not grant console access." };
      }
      await writeAdminAuditLog({
        actor,
        action: "staff.invite",
        targetType: "console_user",
        targetId: existing.id,
        metadata: { mode: "existing_user_promoted", role: "sub_admin" },
        request,
      });
      return { ok: true, mode: "existing_user_promoted", claimsStale: true };
    }

    // New user: attempt an invite (needs Supabase email configured).
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(normalized);
    if (inviteError || !invited?.user) {
      return {
        ok: false,
        error:
          "Could not invite a new user. Confirm the account exists, or enable Supabase email so invitations can be sent.",
      };
    }
    const { error: metaError } = await admin.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { oviz_console_enabled: true, oviz_console_role: "sub_admin" },
    });
    if (metaError) {
      captureOwnerConsoleException(metaError, "staff.invite", { mode: "invite" });
      return { ok: false, error: "Invited, but could not set the console role." };
    }
    await writeAdminAuditLog({
      actor,
      action: "staff.invite",
      targetType: "console_user",
      targetId: invited.user.id,
      metadata: { mode: "invited", role: "sub_admin" },
      request,
    });
    return { ok: true, mode: "invited", claimsStale: true };
  } catch (error) {
    captureOwnerConsoleException(error, "staff.invite");
    return { ok: false, error: "Could not complete the invite." };
  }
}

/** Revoke a staff member's console access. The owner is protected. */
export async function revokeStaff(input: {
  userId: string;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<StaffMutationResult> {
  const { userId, actor, request } = input;
  const admin = createAdminClient();
  try {
    const { data: target, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !target?.user) return { ok: false, error: "User not found." };

    if (isHardcodedOwner({ email: target.user.email, app_metadata: target.user.app_metadata })) {
      return { ok: false, error: "The owner account cannot be revoked." };
    }

    const meta = (target.user.app_metadata as Record<string, unknown> | null) ?? {};
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...meta, oviz_console_enabled: false, oviz_console_role: null },
    });
    if (error) {
      captureOwnerConsoleException(error, "staff.revoke");
      return { ok: false, error: "Could not revoke access." };
    }
    await writeAdminAuditLog({
      actor,
      action: "staff.revoke",
      targetType: "console_user",
      targetId: userId,
      request,
    });
    return { ok: true, claimsStale: true };
  } catch (error) {
    captureOwnerConsoleException(error, "staff.revoke");
    return { ok: false, error: "Could not revoke access." };
  }
}

/** Change a staff member's console role. The owner cannot be demoted. */
export async function changeStaffRole(input: {
  userId: string;
  role: OwnerConsoleRole;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<StaffMutationResult> {
  const { userId, role, actor, request } = input;
  const admin = createAdminClient();
  try {
    const { data: target, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !target?.user) return { ok: false, error: "User not found." };

    if (isHardcodedOwner({ email: target.user.email, app_metadata: target.user.app_metadata })) {
      return { ok: false, error: "The owner account cannot be demoted." };
    }

    const meta = (target.user.app_metadata as Record<string, unknown> | null) ?? {};
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...meta, oviz_console_enabled: true, oviz_console_role: role },
    });
    if (error) {
      captureOwnerConsoleException(error, "staff.role_change");
      return { ok: false, error: "Could not change the role." };
    }
    await writeAdminAuditLog({
      actor,
      action: "staff.role_change",
      targetType: "console_user",
      targetId: userId,
      metadata: { role },
      request,
    });
    return { ok: true, claimsStale: true };
  } catch (error) {
    captureOwnerConsoleException(error, "staff.role_change");
    return { ok: false, error: "Could not change the role." };
  }
}
