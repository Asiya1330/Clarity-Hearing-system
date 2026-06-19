// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { beforeSend, beforeSendTransaction } from "@/lib/sentry/phi-filter";

Sentry.init({
  dsn: "https://985d1450d7d5b07d9f33d66cd7ab185b@o4511191126441984.ingest.us.sentry.io/4511327992479744",

  // 10 % trace sampling — matches the client and keeps both cost and the
  // volume of PHI-adjacent payloads bounded at scale.
  tracesSampleRate: 0.1,

  // Do NOT forward console/server logs to Sentry: log lines carry clinical
  // payloads and are NOT routed through beforeSend, so they cannot be scrubbed.
  enableLogs: false,

  // Healthcare app — never attach PII (IP, headers, request bodies) by default.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Last line of defence: recursively strip PHI/PII from every error and
  // transaction payload before it leaves the server.
  beforeSend,
  beforeSendTransaction,
});
