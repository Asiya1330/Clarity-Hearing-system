// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { beforeSend, beforeSendTransaction } from "@/lib/sentry/phi-filter";

Sentry.init({
  dsn: "https://985d1450d7d5b07d9f33d66cd7ab185b@o4511191126441984.ingest.us.sentry.io/4511327992479744",

  // 10 % trace sampling — matches the client and keeps both cost and the
  // volume of PHI-adjacent payloads bounded at scale.
  tracesSampleRate: 0.1,

  // Do NOT forward console/edge logs to Sentry: log lines carry clinical
  // payloads and are NOT routed through beforeSend, so they cannot be scrubbed.
  enableLogs: false,

  // Healthcare app — never attach PII (IP, headers, request bodies) by default.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Last line of defence: recursively strip PHI/PII from every error and
  // transaction payload before it leaves the edge runtime.
  beforeSend,
  beforeSendTransaction,
});
