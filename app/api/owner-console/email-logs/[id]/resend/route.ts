import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { resendEmailLog } from "@/lib/owner-console/emails";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!verifySameOrigin(request)) return sameOriginFailure();
  const auth = await authorizeOwnerConsoleApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await resendEmailLog({ emailLogId: id, actor: auth.ctx, request });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
