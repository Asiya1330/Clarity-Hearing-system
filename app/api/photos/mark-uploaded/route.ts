import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  photoId: z.string().uuid(),
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
      { error: "Invalid input." },
      { status: 422 },
    );
  }

  // Ownership check — never trust client clinic_id; the photo row must belong
  // to this caller's clinic.
  const { data: photo } = await supabase
    .from("ear_fit_photos")
    .select("id, clinic_id, upload_status")
    .eq("id", parsed.data.photoId)
    .maybeSingle();
  if (!photo || photo.clinic_id !== clinicId) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("ear_fit_photos")
    .update({ upload_status: "uploaded" })
    .eq("id", parsed.data.photoId);
  if (updateError) {
    console.error("ear_fit_photos.mark-uploaded failed", {
      clinicId,
      code: updateError.code,
    });
    return NextResponse.json(
      { error: "We could not record the photo. Please try again." },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    user_id: user.id,
    action: "photo.uploaded",
    metadata: { target_type: "ear_fit_photo", target_id: parsed.data.photoId },
  });

  return NextResponse.json({ ok: true });
}
