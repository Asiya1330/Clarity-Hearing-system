import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This route is dynamic by nature: it reads cookies (via the Supabase server
// client) and returns `cache-control: no-store`, so it always evaluates fresh.
// (An explicit `dynamic` segment export is incompatible with cacheComponents.)

/**
 * Liveness + readiness probe for load balancers / uptime monitoring.
 *
 * Performs a lightweight connectivity check against Postgres via PostgREST: a
 * HEAD count on a known table. RLS returns an empty set for the unauthenticated
 * health caller, but a non-error response confirms PostgREST and Postgres are
 * reachable. No data is read or leaked. Returns 200 when healthy, 503 when the
 * database is unreachable, so orchestrators can route traffic accordingly.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("clinics")
      .select("id", { count: "exact", head: true });
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "up" : "down",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
