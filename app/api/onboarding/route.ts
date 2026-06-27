import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ONBOARDING_CLINIC_OWNER_ROLE } from "@/lib/clinic-roles";
import { createClient } from "@/lib/supabase/server";

const OnboardingSchema = z.object({
  clinicName: z.string().min(1).max(200),
  locationName: z.string().min(1).max(200),
  tier: z.enum(["starter", "pro", "enterprise"]),
  fullName: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  // Validate the session using the regular (anon-key) client.
  const authClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Idempotency: if a profile already exists, skip to dashboard.
  const { data: existingProfile } = await authClient
    .from("profiles")
    .select("id, clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.clinic_id) {
    return NextResponse.json({ redirect: "/dashboard" }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { clinicName, locationName, tier, fullName } = parsed.data;

  // Use service role to bypass RLS for initial clinic/profile/location creation.
  // The service role key never leaves the server; it is not sent to the browser.
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const photoEnabled = tier !== "starter";
  const slug =
    clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now();

  const { data: clinic, error: clinicError } = await adminClient
    .from("clinics")
    .insert({
      name: clinicName,
      slug,
      subscription_plan: tier,
      subscription_status: "trialing",
      photo_module_enabled: photoEnabled,
      max_photo_count: photoEnabled ? 4 : 0,
      max_photo_size_bytes: 500000,
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    console.error("onboarding.clinics.insert failed", {
      code: clinicError?.code,
      message: clinicError?.message,
    });
    return NextResponse.json(
      { error: "Could not create clinic. Please try again." },
      { status: 500 },
    );
  }

  const profilePayload = {
    clinic_id: clinic.id,
    full_name: fullName?.trim() || null,
    role: ONBOARDING_CLINIC_OWNER_ROLE,
  };

  const profileError = existingProfile
    ? (
        await adminClient
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id)
      ).error
    : (
        await adminClient.from("profiles").insert({
          id: user.id,
          ...profilePayload,
        })
      ).error;

  if (profileError) {
    console.error(
      existingProfile
        ? "onboarding.profiles.update failed"
        : "onboarding.profiles.insert failed",
      {
        code: profileError.code,
        message: profileError.message,
      },
    );
    // Roll back the clinic so the user can retry.
    await adminClient.from("clinics").delete().eq("id", clinic.id);
    return NextResponse.json(
      { error: "Could not create profile. Please try again." },
      { status: 500 },
    );
  }

  const { error: locationError } = await adminClient.from("locations").insert({
    clinic_id: clinic.id,
    name: locationName,
    active: true,
  });

  if (locationError) {
    // Non-fatal: location can be added later via Admin → Locations.
    console.error("onboarding.locations.insert failed", {
      code: locationError.code,
      message: locationError.message,
    });
  }

  return NextResponse.json({ redirect: "/dashboard" }, { status: 201 });
}
