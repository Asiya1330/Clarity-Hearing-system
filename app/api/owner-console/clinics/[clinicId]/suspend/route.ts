import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { suspendClinic } from "@/lib/owner-console/account-status";
import { SuspendClinicSchema } from "@/lib/owner-console/zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi({ superAdmin: true });
  if (!auth.ok) return auth.response;

  const { clinicId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = SuspendClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  // Destructive-op guard: typed confirmation must match the clinic name.
  const admin = createAdminClient();
  const { data: clinic } = await admin
    .from("clinics")
    .select("name")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
  }
  if (
    parsed.data.confirmText.trim().toLowerCase() !==
    (clinic.name as string).trim().toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Confirmation text did not match the clinic name." },
      { status: 422 },
    );
  }

  const result = await suspendClinic({
    clinicId,
    reason: parsed.data.reason,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, stripeSyncStatus: result.stripeSyncStatus });
}
