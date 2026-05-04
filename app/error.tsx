"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors in top-level app routes outside the (app) route group
// (e.g. /consults/[id]/report). Renders within the root layout.
export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-white px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-slate">
          OViz by OtoVantage
        </p>
        <h1 className="mb-3 text-2xl font-bold text-brand-navy">
          An unexpected error occurred
        </h1>
        <p className="mb-6 text-brand-slate">
          OViz could not complete this request. Try reloading the page. If the
          problem continues, contact your clinic administrator.
        </p>

        {error.digest && (
          <p className="mb-4 font-mono text-xs text-brand-slate">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-brand-teal px-5 py-2.5 text-sm font-semibold text-brand-white hover:bg-brand-teal/90"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-brand-slate/30 px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-brand-slate/5"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
