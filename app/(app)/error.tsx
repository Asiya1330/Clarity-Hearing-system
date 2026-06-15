"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
        <h1 className="mb-3 font-heading text-3xl font-semibold text-brand-navy">
          Something went wrong
        </h1>
        <p className="mb-6 text-lg leading-relaxed text-brand-muted">
          OViz hit an unexpected error on this page. Try again. If it keeps
          happening, contact your clinic administrator.
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
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
