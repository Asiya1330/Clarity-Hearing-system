import { NextResponse, type NextRequest } from "next/server";
import { calculateImpact } from "@/lib/calculators/impact";
import { createClient } from "@/lib/supabase/server";
import { ConsultInputSchema } from "@/lib/zod/consult";

const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;

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

  // profiles.id = auth.uid() — no separate user_id column.
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

  const clinicId = profile.clinic_id;

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, subscription_status")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError || !clinic) {
    return NextResponse.json(
      { error: "Clinic record could not be verified." },
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

  const parsed = ConsultInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Some inputs are out of range. Review the highlighted fields and try again.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }
  const inputs = parsed.data;

  const { data: consult, error: consultError } = await supabase
    .from("consults")
    .insert({
      clinic_id: clinicId,
      clinician_id: user.id,
      status: "completed",
    })
    .select("id")
    .single();

  if (consultError || !consult) {
    console.error("consults.insert failed", { clinicId, code: consultError?.code });
    return NextResponse.json(
      { error: "We could not start the consult. Please try again." },
      { status: 500 },
    );
  }

  const outputs = calculateImpact(inputs);

  const { error: modelRunError } = await supabase.from("model_runs").insert({
    consult_id: consult.id,
    inputs,
    outputs,
    model_version: outputs.modelVersion,
  });

  if (modelRunError) {
    console.error("model_runs.insert failed", {
      clinicId,
      consultId: consult.id,
      code: modelRunError.code,
    });
    return NextResponse.json(
      { error: "We could not save the consult results. Please try again." },
      { status: 500 },
    );
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    user_id: user.id,
    action: "consult.create",
    metadata: { target_type: "consult", target_id: consult.id },
  });

  if (auditError) {
    // Audit log failure is logged but does not roll back the consult.
    console.error("audit_logs.insert failed", {
      clinicId,
      consultId: consult.id,
      code: auditError.code,
    });
  }

  return NextResponse.json(
    { consultId: consult.id, outputs },
    { status: 201 },
  );
}
