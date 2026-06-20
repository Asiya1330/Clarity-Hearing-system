import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { revokeStaff } from "@/lib/owner-console/staff";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi({ superAdmin: true });
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;
  const result = await revokeStaff({ userId, actor: auth.ctx, request });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, claimsStale: result.claimsStale });
}
