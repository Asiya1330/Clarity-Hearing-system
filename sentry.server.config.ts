import * as Sentry from "@sentry/nextjs";
import { beforeSend } from "@/lib/sentry/phi-filter";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 10 % sample rate for performance monitoring.
  tracesSampleRate: 0.1,

  // sendDefaultPii defaults to false — never set true in a healthcare app.
  // enableLogs is omitted — console output may contain clinic/patient context.

  // Next.js redirect() and notFound() throw internally; they are not errors.
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],

  beforeSend,
});
