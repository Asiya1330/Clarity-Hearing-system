import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { inviteStaff } from "@/lib/owner-console/staff";
import { StaffInviteSchema } from "@/lib/owner-console/zod";

export async function POST(request: NextRequest) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi({ superAdmin: true });
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = StaffInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await inviteStaff({
    email: parsed.data.email,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, mode: result.mode, claimsStale: result.claimsStale });
}
