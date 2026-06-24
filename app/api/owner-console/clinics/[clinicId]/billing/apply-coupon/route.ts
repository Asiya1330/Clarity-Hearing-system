import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { applyCouponForClinic } from "@/lib/owner-console/billing";
import { ApplyCouponSchema } from "@/lib/owner-console/zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clinicId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi({ superAdmin: true });
  if (!auth.ok) return auth.response;

  const { clinicId } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = ApplyCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await applyCouponForClinic({
    clinicId,
    couponId: parsed.data.couponId,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
