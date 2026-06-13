import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatientResponsesSchema } from "@/lib/zod/intake";

interface RouteContext {
  params: Promise<{ token: string }>;
}

type LinkRow = {
  id: string;
  consult_id: string;
  clinic_id: string;
  mode: "kiosk" | "email";
  expires_at: string;
  used_at: string | null;
};

async function loadOpenIntake(token: string) {
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("intake_links")
    .select("id, consult_id, clinic_id, mode, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) return null;
  const l = link as LinkRow;
  if (l.used_at) return null;
  if (new Date(l.expires_at).getTime() < Date.now()) return null;

  const { data: consult } = await admin
    .from("consults")
    .select("id, status, patient_name, clinic_id")
    .eq("id", l.consult_id)
    .maybeSingle();
  if (!consult || consult.status !== "awaiting_patient") return null;

  const { data: clinic } = await admin
    .from("clinics")
    .select("name")
    .eq("id", l.clinic_id)
    .maybeSingle();

  return {
    admin,
    link: l,
    consult: consult as { id: string; patient_name: string | null },
    clinicName: (clinic?.name as string | undefined) ?? "Your clinic",
  };
}

const NOT_FOUND = NextResponse.json(
  { error: "This link is no longer available." },
  { status: 404 },
);

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const open = await loadOpenIntake(token);
  if (!open) return NOT_FOUND;

  return NextResponse.json({
    mode: open.link.mode,
    clinicName: open.clinicName,
    patientName: open.consult.patient_name,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const open = await loadOpenIntake(token);
  if (!open) return NOT_FOUND;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body could not be read." },
      { status: 400 },
    );
  }

  const parsed = PatientResponsesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some answers are out of range. Please review and try again.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const { admin, link } = open;
  const submittedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("consults")
    .update({
      patient_responses: parsed.data,
      patient_responses_submitted_at: submittedAt,
      status: "patient_complete",
    })
    .eq("id", link.consult_id)
    .eq("status", "awaiting_patient");
  if (updateError) {
    console.error("intake.submit.update failed", {
      consultId: link.consult_id,
      code: updateError.code,
    });
    return NextResponse.json(
      { error: "We could not save your answers. Please try again." },
      { status: 500 },
    );
  }

  const { error: linkError } = await admin
    .from("intake_links")
    .update({ used_at: submittedAt })
    .eq("id", link.id);
  if (linkError) {
    console.error("intake.submit.link-close failed", {
      linkId: link.id,
      code: linkError.code,
    });
  }

  return NextResponse.json({ ok: true, mode: link.mode }, { status: 200 });
}
