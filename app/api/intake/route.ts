import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateIntakeSchema } from "@/lib/zod/intake";
import { isResendConfigured, sendAndLogEmail } from "@/lib/email/resend";
import { isKioskEnabled } from "@/lib/owner-console/entitlements";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;
const LINK_TTL_HOURS = { kiosk: 4, email: 24 * 7 } as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: "Your session has ended. Please sign in to continue." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.clinic_id) {
    return NextResponse.json(
      {
        error:
          "Your account is not linked to a clinic. Contact your clinic administrator.",
      },
      { status: 403 },
    );
  }
  const clinicId = profile.clinic_id as string;

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, name, subscription_status, account_status")
    .eq("id", clinicId)
    .maybeSingle();
  if (clinicError || !clinic) {
    return NextResponse.json(
      { error: "Clinic record could not be verified." },
      { status: 403 },
    );
  }

  if (clinic.account_status === "suspended") {
    return NextResponse.json(
      { error: "This clinic's account is currently paused." },
      { status: 403 },
    );
  }

  if (
    !ACTIVE_SUBSCRIPTION_STATUSES.includes(
      clinic.subscription_status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error:
          "This clinic's subscription is not active. Update billing to resume consults.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body could not be read." },
      { status: 400 },
    );
  }

  const parsed = CreateIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some inputs are invalid. Review the fields and try again.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }
  const { mode, patientName, consultDate, isFollowUp, patientEmail } =
    parsed.data;

  // Owner-console entitlement gate: kiosk mode can be disabled per clinic.
  if (mode === "kiosk" && !(await isKioskEnabled(clinicId))) {
    return NextResponse.json(
      { error: "Kiosk mode is not enabled for this clinic." },
      { status: 403 },
    );
  }

  const { data: consult, error: consultError } = await supabase
    .from("consults")
    .insert({
      clinic_id: clinicId,
      clinician_id: user.id,
      status: "awaiting_patient",
      intake_mode: mode,
      patient_name: patientName ?? null,
      consult_date: consultDate,
      is_follow_up: isFollowUp,
    })
    .select("id")
    .single();
  if (consultError || !consult) {
    console.error("intake.consult.insert failed", {
      clinicId,
      code: consultError?.code,
    });
    return NextResponse.json(
      { error: "We could not start the consult. Please try again." },
      { status: 500 },
    );
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + LINK_TTL_HOURS[mode] * 3600 * 1000,
  ).toISOString();

  const { error: linkError } = await supabase.from("intake_links").insert({
    consult_id: consult.id,
    clinic_id: clinicId,
    token,
    mode,
    patient_email: mode === "email" ? patientEmail : null,
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (linkError) {
    console.error("intake_links.insert failed", {
      clinicId,
      consultId: consult.id,
      code: linkError.code,
    });
    return NextResponse.json(
      { error: "We could not create the intake link. Please try again." },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    request.nextUrl.origin;
  const url = `${origin}/intake/${token}`;

  let emailSent = false;
  let emailError: string | null = null;
  if (mode === "email" && patientEmail) {
    if (isResendConfigured()) {
      // sendAndLogEmail records an email_logs row (masked + hashed recipient,
      // never the raw address) via the service role. The patient address is
      // never logged to Sentry/console.
      const subject = `${clinic.name} — a few questions before your hearing appointment`;
      const result = await sendAndLogEmail(
        {
          to: patientEmail,
          subject,
          html: buildEmailHtml(clinic.name as string, url),
        },
        {
          clinicId,
          consultId: consult.id,
          template: "patient_intake",
          subject,
          recipientEmail: patientEmail,
        },
      );
      if (result.ok) {
        emailSent = true;
      } else {
        emailError = "Email could not be sent. Copy the link and send it manually.";
        console.error("intake.email.send failed", {
          consultId: consult.id,
          code: result.errorCode,
        });
      }
    } else {
      emailError =
        "Email sending is not configured (RESEND_API_KEY / INTAKE_EMAIL_FROM). Copy the link and send it manually.";
    }
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    user_id: user.id,
    action: "consult.intake_link.create",
    metadata: { target_type: "consult", target_id: consult.id, mode },
  });
  if (auditError) {
    console.error("audit_logs.insert failed", {
      clinicId,
      consultId: consult.id,
      code: auditError.code,
    });
  }

  return NextResponse.json(
    { consultId: consult.id, url, expiresAt, emailSent, emailError },
    { status: 201 },
  );
}

function buildEmailHtml(clinicName: string, url: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F1F5F6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F6;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E1E8EA;border-radius:16px;overflow:hidden;">
          <tr><td style="height:4px;background:#008B8B;"></td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#00696A;font-weight:bold;">${escapeHtml(clinicName)}</p>
            <h1 style="margin:0 0 16px;font-size:24px;color:#002147;">A few questions before your appointment</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#44525E;">
              To make the most of your upcoming hearing appointment, please answer a short set of
              questions about your everyday listening. It takes about 5 minutes, and your answers
              go directly to your hearing care team.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#44525E;">
              There are no right or wrong answers — just tell us how things feel day to day.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#008B8B;border-radius:10px;">
              <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:18px;font-weight:bold;color:#ffffff;text-decoration:none;">Answer the questions</a>
            </td></tr></table>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#708090;">
              This personal link works once and expires in 7 days. If the button doesn't work,
              copy and paste this address into your browser:<br/>
              <span style="color:#00696A;word-break:break-all;">${url}</span>
            </p>
          </td></tr>
          <tr><td style="padding:18px 36px;border-top:1px solid #E1E8EA;">
            <p style="margin:0;font-size:12px;color:#708090;">Sent by ${escapeHtml(clinicName)} using OViz by OtoVantage.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
