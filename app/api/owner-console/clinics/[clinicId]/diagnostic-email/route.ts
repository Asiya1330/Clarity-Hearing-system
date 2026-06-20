import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { sendDiagnosticEmail } from "@/lib/owner-console/emails";
import { DiagnosticEmailSchema } from "@/lib/owner-console/zod";

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
  const parsed = DiagnosticEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const result = await sendDiagnosticEmail({
    clinicId,
    kind: parsed.data.kind,
    actor: auth.ctx,
    request,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
