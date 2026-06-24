import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeOwnerConsoleApi,
  sameOriginFailure,
  verifySameOrigin,
} from "@/lib/owner-console/auth";
import { writeAdminAuditLog } from "@/lib/owner-console/audit";
import { SupportViewEventSchema } from "@/lib/owner-console/zod";

/** Records support-view open/close events to the immutable audit trail. */
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
  const parsed = SupportViewEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  await writeAdminAuditLog({
    actor: auth.ctx,
    action: parsed.data.event === "start" ? "support_view.start" : "support_view.close",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    request,
  });

  return NextResponse.json({ ok: true });
}
