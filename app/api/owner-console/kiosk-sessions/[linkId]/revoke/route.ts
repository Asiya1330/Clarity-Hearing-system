import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { revokeKioskSession } from "@/lib/owner-console/kiosk";
import { RevokeKioskSchema } from "@/lib/owner-console/zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = RevokeKioskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await revokeKioskSession({
    linkId,
    reason: parsed.data.reason,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
