import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { setEntitlements } from "@/lib/owner-console/entitlements";
import { EntitlementsSchema } from "@/lib/owner-console/zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi();
  if (!auth.ok) return auth.response;

  const { clinicId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = EntitlementsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await setEntitlements({
    clinicId,
    values: {
      enable_kiosk_mode: parsed.data.enable_kiosk_mode,
      enable_presentation_mode: parsed.data.enable_presentation_mode,
      enable_audiogram_ai_beta: parsed.data.enable_audiogram_ai_beta,
      notes: parsed.data.notes ?? null,
    },
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
