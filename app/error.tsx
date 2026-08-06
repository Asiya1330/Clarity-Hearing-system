"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RisingLine } from "@/components/app/rising-line";

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
    <div className="oviz-surface flex min-h-screen items-center justify-center bg-brand-mist/40 px-6">
      <div className="max-w-md text-center">
        <div className="mb-3 flex items-center justify-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal-700">
            Clarity-Hearing-system
          </span>
          <RisingLine className="h-3 w-16 opacity-70" />
        </div>
        <h1 className="mb-3 font-heading text-3xl font-semibold text-brand-navy">
          Something went wrong
        </h1>
        <p className="mb-6 text-lg leading-relaxed text-brand-muted">
          Clarity-Hearing-system couldn&apos;t complete this request. Reload the page to try
          again. If it keeps happening, contact your clinic administrator.
        </p>

        {error.digest && (
          <p className="mb-6 font-mono text-sm text-brand-muted">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
