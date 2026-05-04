import { NextResponse } from "next/server";

// Development-only route to verify Sentry is capturing server errors.
// Usage: GET /api/test-sentry
// Returns 404 in any non-development environment.
export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  throw new Error(
    "[OViz dev] Sentry connectivity test — remove this route before go-live.",
  );
}
