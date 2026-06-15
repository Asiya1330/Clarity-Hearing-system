import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 500_000;
const MAX_PHOTOS = 4;
const BUCKET = "ear-fit-photos";

const Body = z.object({
  consultId: z.string().uuid(),
  fileSize: z.number().int().positive().max(MAX_BYTES),
  fileType: z.literal("image/jpeg"),
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
    .select("subscription_status, subscription_plan, photo_module_enabled")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) {
    return NextResponse.json(
      { error: "Clinic record could not be verified." },
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
        error: "The file must be a JPEG no larger than 500 KB.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const { data: consult } = await supabase
    .from("consults")
    .select("id, clinic_id, photo_consent")
    .eq("id", parsed.data.consultId)
    .maybeSingle();
  if (!consult || consult.clinic_id !== clinicId) {
    return NextResponse.json({ error: "Consult not found." }, { status: 404 });
  }
  if (consult.photo_consent !== true) {
    return NextResponse.json(
      { error: "Photo consent is required before uploading." },
      { status: 403 },
    );
  }

  // Count successful uploads only — pending/failed rows do not block retries.
  const { count, error: countError } = await supabase
    .from("ear_fit_photos")
    .select("id", { count: "exact", head: true })
    .eq("consult_id", parsed.data.consultId)
    .eq("upload_status", "uploaded");
  if (countError) {
    console.error("ear_fit_photos.count failed", {
      clinicId,
      code: countError.code,
    });
    return NextResponse.json(
      { error: "We could not prepare the upload. Please try again." },
      { status: 500 },
    );
  }
  if ((count ?? 0) >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: "This consult has reached its 4-photo limit." },
      { status: 409 },
    );
  }

  const photoId = crypto.randomUUID();
  const path = `${clinicId}/${parsed.data.consultId}/${photoId}.jpg`;

  const { error: insertError } = await supabase.from("ear_fit_photos").insert({
    id: photoId,
    consult_id: parsed.data.consultId,
    clinic_id: clinicId,
    storage_path: path,
    upload_status: "pending",
    file_size_bytes: parsed.data.fileSize,
    created_by: user.id,
  });
  if (insertError) {
    console.error("ear_fit_photos.insert failed", {
      clinicId,
      code: insertError.code,
    });
    return NextResponse.json(
      { error: "We could not prepare the upload. Please try again." },
      { status: 500 },
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) {
    console.error("createSignedUploadUrl failed", {
      clinicId,
      code: signError?.message,
    });
    return NextResponse.json(
      { error: "We could not prepare the upload. Please try again." },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    user_id: user.id,
    action: "photo.signed_upload_issued",
    metadata: { target_type: "ear_fit_photo", target_id: photoId },
  });

  return NextResponse.json({
    photoId,
    path: signed.path,
    token: signed.token,
    uploadUrl: signed.signedUrl,
  });
}
