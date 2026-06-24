import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { changeStaffRole } from "@/lib/owner-console/staff";
import { StaffRoleChangeSchema } from "@/lib/owner-console/zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi({ superAdmin: true });
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = StaffRoleChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await changeStaffRole({
    userId,
    role: parsed.data.role,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, claimsStale: result.claimsStale });
}
