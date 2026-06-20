/**
 * Console health checks. SERVER-ONLY. Reports connectivity + config presence;
 * never reads or returns secret values.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { captureOwnerConsoleException } from "./observability";

export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("clinics")
      .select("id", { count: "exact", head: true });
    if (error) {
      captureOwnerConsoleException(error, "health.db_check");
    }
    return { ok: !error, latencyMs: Date.now() - start };
  } catch (error) {
    captureOwnerConsoleException(error, "health.db_check");
    return { ok: false, latencyMs: Date.now() - start };
  }
}
