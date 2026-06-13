import { NextResponse, type NextRequest } from "next/server";
import { calculateImpact } from "@/lib/calculators/impact";
import { createClient } from "@/lib/supabase/server";
import { ConsultInputSchema } from "@/lib/zod/consult";
import { ClinicianInputsSchema } from "@/lib/zod/intake";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  // RLS scopes this to the clinician's clinic; absence = not found.
  const { data: consult, error: consultError } = await supabase
    .from("consults")
    .select("id, clinic_id, status, patient_responses")
    .eq("id", id)
    .maybeSingle();
  if (consultError || !consult) {
    return NextResponse.json(
      { error: "Consult could not be found." },
      { status: 404 },
    );
  }
  if (consult.status !== "patient_complete" || !consult.patient_responses) {
    return NextResponse.json(
      {
        error:
          "Patient responses have not been received yet, so results cannot be generated.",
      },
      { status: 409 },
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

  const clinicianParsed = ClinicianInputsSchema.safeParse(body);
  if (!clinicianParsed.success) {
    return NextResponse.json(
      {
        error:
          "Some inputs are out of range. Review the highlighted fields and try again.",
        issues: clinicianParsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const merged = {
    ...(consult.patient_responses as Record<string, unknown>),
    ...clinicianParsed.data,
  };
  const inputsParsed = ConsultInputSchema.safeParse(merged);
  if (!inputsParsed.success) {
    return NextResponse.json(
      { error: "Stored patient responses are invalid for this consult." },
      { status: 422 },
    );
  }
  const inputs = inputsParsed.data;

  const outputs = calculateImpact(inputs);

  const { error: modelRunError } = await supabase.from("model_runs").insert({
    consult_id: consult.id,
    inputs,
    outputs,
    model_version: outputs.modelVersion,
  });
  if (modelRunError) {
    console.error("consult.complete model_runs.insert failed", {
      consultId: consult.id,
      code: modelRunError.code,
    });
    return NextResponse.json(
      { error: "We could not save the consult results. Please try again." },
      { status: 500 },
    );
  }

  const { error: statusError } = await supabase
    .from("consults")
    .update({ status: "completed" })
    .eq("id", consult.id);
  if (statusError) {
    console.error("consult.complete status update failed", {
      consultId: consult.id,
      code: statusError.code,
    });
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    clinic_id: consult.clinic_id,
    user_id: user.id,
    action: "consult.complete",
    metadata: { target_type: "consult", target_id: consult.id },
  });
  if (auditError) {
    console.error("audit_logs.insert failed", {
      consultId: consult.id,
      code: auditError.code,
    });
  }

  return NextResponse.json({ consultId: consult.id, outputs }, { status: 200 });
}
