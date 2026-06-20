import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  consultId: z.string().uuid(),
  granted: z.boolean(),
});

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.clinic_id) {
    return NextResponse.json(
      {
        error:
          "Your account is not linked to a clinic. Contact your clinic administrator.",
      },
      { status: 403 },
    );
  }
  const clinicId = profile.clinic_id as string;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("subscription_status, subscription_plan, photo_module_enabled, account_status")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) {
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
    clinic.subscription_status !== "trialing" &&
    clinic.subscription_status !== "active"
  ) {
    return NextResponse.json(
      { error: "This clinic's subscription is not active." },
      { status: 403 },
    );
  }
  if (
    clinic.subscription_plan !== "pro" &&
    clinic.subscription_plan !== "enterprise"
  ) {
    return NextResponse.json(
      { error: "Ear Fit Photos require a Pro or Enterprise plan." },
      { status: 403 },
    );
  }
  if (clinic.photo_module_enabled !== true) {
    return NextResponse.json(
      { error: "Ear Fit Photos are not enabled for this clinic." },
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

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  // Server-side ownership check — never trust client clinic_id.
  const { data: consult } = await supabase
    .from("consults")
    .select("id, clinic_id")
    .eq("id", parsed.data.consultId)
    .maybeSingle();
  if (!consult || consult.clinic_id !== clinicId) {
    return NextResponse.json({ error: "Consult not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("consults")
    .update({ photo_consent: parsed.data.granted })
    .eq("id", parsed.data.consultId);

  if (updateError) {
    console.error("photo_consent.update failed", {
      clinicId,
      code: updateError.code,
    });
    return NextResponse.json(
      { error: "We could not save the consent. Please try again." },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    user_id: user.id,
    action: parsed.data.granted
      ? "consult.photo_consent_granted"
      : "consult.photo_consent_revoked",
    metadata: { target_type: "consult", target_id: parsed.data.consultId },
  });

  return NextResponse.json({ ok: true });
}
