/**
 * Server-only transactional-email wrapper (Resend) + delivery logging.
 *
 * Used by the patient-intake route and by owner-console diagnostic/reset email
 * actions. Sending is best-effort and fully decoupled from link creation: if
 * Resend is not configured, callers still succeed and fall back to "copy the
 * link" — exactly as before this wrapper existed.
 *
 * PRIVACY: email_logs stores a MASKED recipient and a salted hash, never the
 * raw full address (unless a caller explicitly opts in, which we do not). The
 * raw address is never written to Sentry or console logs.
 *
 * email_logs has RLS enabled with no client policies, so logging uses the
 * service-role admin client.
 */

import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureOwnerConsoleException } from "@/lib/owner-console/observability";

const RESEND_API = "https://api.resend.com/emails";

export type EmailStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "unknown";

export function isResendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.INTAKE_EMAIL_FROM);
}

/** Mask an email so it is recognisable but not personally identifying. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskPart = (s: string) =>
    s.length <= 2 ? `${s[0] ?? ""}*` : `${s.slice(0, 2)}${"*".repeat(s.length - 2)}`;
  const dot = domain.lastIndexOf(".");
  if (dot < 1) return `${maskPart(local)}@***`;
  const name = domain.slice(0, dot);
  const tld = domain.slice(dot); // includes leading dot
  return `${maskPart(local)}@${maskPart(name)}${tld}`;
}

/** Salted, one-way hash of a normalized email (for search/correlation). */
export function hashEmail(email: string): string {
  const salt = process.env.OWNER_CONSOLE_AUDIT_HASH_SALT ?? "oviz-owner-console-unsalted";
  return createHmac("sha256", salt).update(email.trim().toLowerCase()).digest("hex");
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  status: EmailStatus;
  providerMessageId?: string;
  errorCode?: string;
}

/** Send one email via Resend. Never throws; failures map to a status. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? process.env.INTAKE_EMAIL_FROM;
  if (!apiKey || !from) {
    return { ok: false, status: "failed", errorCode: "not_configured" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (res.ok) {
      let id: string | undefined;
      try {
        const body = (await res.json()) as { id?: string };
        id = body.id;
      } catch {
        /* ignore body parse */
      }
      return { ok: true, status: "sent", providerMessageId: id };
    }
    return { ok: false, status: "failed", errorCode: `http_${res.status}` };
  } catch {
    // Network/unknown — we cannot prove failure to deliver.
    return { ok: false, status: "unknown", errorCode: "network_error" };
  }
}

export interface LogEmailInput {
  clinicId: string | null;
  consultId?: string | null;
  template?: string;
  subject?: string;
  recipientEmail: string;
  status: EmailStatus;
  providerMessageId?: string | null;
  lastError?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an email_logs row via the service role. Best-effort: a logging failure
 * is reported to Sentry but never breaks the calling flow.
 */
export async function logEmail(input: LogEmailInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("email_logs").insert({
      clinic_id: input.clinicId,
      consult_id: input.consultId ?? null,
      provider: "resend",
      provider_message_id: input.providerMessageId ?? null,
      template: input.template ?? null,
      subject: input.subject ?? null,
      recipient_email_masked: maskEmail(input.recipientEmail),
      recipient_email_hash: hashEmail(input.recipientEmail),
      status: input.status,
      last_error: input.lastError ?? null,
      metadata: input.metadata ?? {},
      sent_at: input.status === "sent" || input.status === "delivered"
        ? new Date().toISOString()
        : null,
    });
    if (error) {
      captureOwnerConsoleException(
        new Error("email_logs.insert failed"),
        "email.log",
        { code: error.code },
      );
    }
  } catch (error) {
    captureOwnerConsoleException(error, "email.log");
  }
}

/** Send and log in one call. Returns the send result. */
export async function sendAndLogEmail(
  send: SendEmailInput,
  log: Omit<LogEmailInput, "status" | "providerMessageId" | "lastError">,
): Promise<SendEmailResult> {
  const result = await sendEmail(send);
  await logEmail({
    ...log,
    status: result.status,
    providerMessageId: result.providerMessageId ?? null,
    lastError: result.ok ? null : (result.errorCode ?? null),
  });
  return result;
}
