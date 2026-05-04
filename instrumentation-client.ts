import * as Sentry from "@sentry/nextjs";
import { beforeSend } from "@/lib/sentry/phi-filter";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media to prevent PHI capture in session recordings.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 10 % session sample rate; 100 % on errors.
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // sendDefaultPii defaults to false — never set true in a healthcare app.
  // enableLogs omitted — console output may contain clinic/patient context.

  beforeSend,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
