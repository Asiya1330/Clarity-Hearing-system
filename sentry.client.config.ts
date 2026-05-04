import * as Sentry from "@sentry/nextjs";
import { beforeSend } from "@/lib/sentry/phi-filter";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 10 % sample rate keeps performance-monitoring costs manageable.
  tracesSampleRate: 0.1,

  // sendDefaultPii defaults to false — never set true in a healthcare app.

  // Suppress noise from browser extensions and transient network failures.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^Failed to fetch$/,
    /^NetworkError/,
    /^Load failed$/,
    /^AbortError/,
    // Next.js internal navigation signals — not real errors.
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],

  beforeSend,
});
