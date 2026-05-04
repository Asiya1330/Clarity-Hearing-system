import * as Sentry from "@sentry/nextjs";

// Minimal config for the Next.js edge runtime (middleware).
// The middleware handles session refresh and auth redirects only — no clinical data.
// sendDefaultPii defaults to false — never set true in a healthcare app.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
});
