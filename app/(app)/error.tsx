"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors in any (app) route (dashboard, consults, admin).
// Renders within app/(app)/layout.tsx so the nav and brand styles are present.
export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="max-w-md">
        <h1 className="mb-3 text-2xl font-bold text-brand-navy">
          Something went wrong
        </h1>
        <p className="mb-6 text-brand-slate">
          OViz encountered an unexpected error on this page. Try again. If the
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
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
