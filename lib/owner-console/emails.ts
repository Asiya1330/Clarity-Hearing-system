/**
 * Owner-console email auditor read + safe resend. SERVER-ONLY.
 *
 * Raw recipient addresses are intentionally NOT retained (only masked + hashed
 * forms are stored), so "resend" cannot target the original recipient. Instead
 * it safely re-sends to the CLINIC OWNER's current address, resolved live. This
 * keeps the action useful for support (e.g. "the owner never got their email")
 * without ever reconstructing a patient's address.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAndLogEmail, isResendConfigured } from "@/lib/email/resend";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";

export interface EmailLogRow {
  id: string;
  clinicId: string | null;
  clinicName: string | null;
  maskedRecipient: string | null;
  status: string;
  template: string | null;
  subject: string | null;
  providerMessageId: string | null;
  createdAt: string;
}

export interface EmailLogListResult {
  rows: EmailLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listEmailLogs(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<EmailLogListResult> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const search = params.search?.trim();
  const status = params.status?.trim();

  let query = admin
    .from("email_logs")
    .select(
      "id, clinic_id, recipient_email_masked, status, template, subject, provider_message_id, created_at, clinics(name)",
      { count: "exact" },
    );

  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("recipient_email_masked", `%${search}%`);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return { rows: [], total: 0, page, pageSize };

  const rows = ((data ?? []) as Record<string, unknown>[]).map((e) => {
    const clinic = e.clinics as { name: string } | { name: string }[] | null;
    const clinicName = Array.isArray(clinic) ? clinic[0]?.name : clinic?.name;
    return {
      id: e.id as string,
      clinicId: (e.clinic_id as string | null) ?? null,
      clinicName: clinicName ?? null,
      maskedRecipient: (e.recipient_email_masked as string | null) ?? null,
      status: e.status as string,
      template: (e.template as string | null) ?? null,
      subject: (e.subject as string | null) ?? null,
      providerMessageId: (e.provider_message_id as string | null) ?? null,
      createdAt: e.created_at as string,
    };
  });

  return { rows, total: count ?? 0, page, pageSize };
}

async function ownerEmailForClinic(
  admin: ReturnType<typeof createAdminClient>,
  clinicId: string,
): Promise<string | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("role", "owner")
    .maybeSingle();
  if (!profile?.id) return null;
  try {
    const { data } = await admin.auth.admin.getUserById(profile.id as string);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function resendEmailLog(input: {
  emailLogId: string;
  actor: AdminAuditActor;
  request?: Request;
}): Promise<{ ok: boolean; error?: string }> {
  const { emailLogId, actor, request } = input;
  if (!isResendConfigured()) {
    return { ok: false, error: "Email sending is not configured." };
  }

  const admin = createAdminClient();
  const { data: log } = await admin
    .from("email_logs")
    .select("id, clinic_id, template, subject")
    .eq("id", emailLogId)
    .maybeSingle();
  if (!log?.clinic_id) return { ok: false, error: "Email record not found." };

  const ownerEmail = await ownerEmailForClinic(admin, log.clinic_id as string);
  if (!ownerEmail) {
    return { ok: false, error: "Could not resolve the clinic owner address." };
  }

  const subject = (log.subject as string | null) ?? "OViz — resent notification";
  try {
    const result = await sendAndLogEmail(
      {
        to: ownerEmail,
        subject: `[Resent] ${subject}`,
        html: resendHtml(subject),
      },
      {
        clinicId: log.clinic_id as string,
        template: (log.template as string | null) ?? "auditor_resend",
        subject: `[Resent] ${subject}`,
        recipientEmail: ownerEmail,
        metadata: { resendOf: emailLogId },
      },
    );

    await writeAdminAuditLog({
      actor,
      action: "email.diagnostic_send",
      targetType: "email_log",
      targetId: emailLogId,
      targetClinicId: log.clinic_id as string,
      metadata: { via: "auditor_resend", status: result.status },
      request,
    });

    return result.ok
      ? { ok: true }
      : { ok: false, error: "The provider did not accept the message." };
  } catch (error) {
    captureOwnerConsoleException(error, "email.diagnostic_send", { emailLogId });
    return { ok: false, error: "Could not resend. Try again." };
  }
}

/**
 * Send a diagnostic test email, or a password-reset/recovery link, to the
 * clinic owner. Recovery links are generated server-side via the Admin API and
 * delivered through Resend (so they work regardless of Supabase SMTP config).
 */
export async function sendDiagnosticEmail(input: {
  clinicId: string;
  kind: "diagnostic" | "reset";
  actor: AdminAuditActor;
  request?: Request;
}): Promise<{ ok: boolean; error?: string }> {
  const { clinicId, kind, actor, request } = input;
  if (!isResendConfigured()) {
    return { ok: false, error: "Email sending is not configured." };
  }
  const admin = createAdminClient();
  const ownerEmail = await ownerEmailForClinic(admin, clinicId);
  if (!ownerEmail) {
    return { ok: false, error: "Could not resolve the clinic owner address." };
  }

  let subject: string;
  let html: string;
  let template: string;

  if (kind === "reset") {
    template = "owner_password_reset";
    subject = "OViz — reset your password";
    let actionLink: string | null = null;
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
      const { data } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: ownerEmail,
        options: siteUrl ? { redirectTo: `${siteUrl}/auth/update-password` } : undefined,
      });
      actionLink = data?.properties?.action_link ?? null;
    } catch (error) {
      captureOwnerConsoleException(error, "email.reset_link_send", { clinicId });
    }
    if (!actionLink) {
      return { ok: false, error: "Could not generate a reset link." };
    }
    html = resetHtml(actionLink);
  } else {
    template = "owner_diagnostic";
    subject = "OViz — diagnostic test email";
    html = diagnosticHtml();
  }

  const result = await sendAndLogEmail(
    { to: ownerEmail, subject, html },
    { clinicId, template, subject, recipientEmail: ownerEmail, metadata: { kind } },
  );

  await writeAdminAuditLog({
    actor,
    action: kind === "reset" ? "email.reset_link_send" : "email.diagnostic_send",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: { kind, status: result.status },
    request,
  });

  return result.ok
    ? { ok: true }
    : { ok: false, error: "The provider did not accept the message." };
}

function diagnosticHtml(): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#002147;">
  <p>This is a diagnostic test email from the OViz Control Room. If you received it, transactional email delivery to this clinic is working.</p>
  </body></html>`;
}

function resetHtml(link: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#002147;">
  <p>An administrator initiated a password reset for your OViz account.</p>
  <p><a href="${link}" style="color:#008B8B;">Reset your password</a></p>
  <p>If you did not expect this, you can ignore this email.</p>
  </body></html>`;
}

function resendHtml(subject: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#002147;">
  <p>This is a re-sent copy of an earlier OViz notification (<strong>${escapeHtml(subject)}</strong>), issued by an administrator from the OViz Control Room.</p>
  <p>If you did not expect this, you can ignore it.</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
