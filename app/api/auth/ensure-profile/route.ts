import { NextResponse } from "next/server";
import { ensureOwnerProfile } from "@/lib/provisioning/ensure-owner-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const authClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    console.error("ensure-profile: missing service role key", error);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const result = await ensureOwnerProfile(adminClient, user.id, fullName);

  if (!result.ok) {
    console.error("ensure-profile failed", { userId: user.id, error: result.error });
    return NextResponse.json(
      { error: "Could not create profile. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, created: result.created });
}
