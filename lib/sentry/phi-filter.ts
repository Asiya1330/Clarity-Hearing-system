import type { ErrorEvent } from "@sentry/nextjs";

/**
 * PHI filtering for Sentry events.
 *
 * Applied via beforeSend on both client and server configs.
 * Prevents clinical inputs, calculator outputs, storage paths, and signed
 * URLs from reaching Sentry.
 *
 * NOT filtered: error messages, stack traces, route names, error codes.
 * FILTERED: request bodies, storage URLs, known PHI keys in extra context.
 */

// Keys that may carry clinical or patient-identifying data in extra/contexts.
const PHI_KEYS = new Set([
  "patient_reference",
  "outputs", // ImpactOutputs — clinical projections
  "storage_path", // ear-fit-photo storage paths
  "signedUrl",
  "signed_url",
  "report_footer", // clinic contact info
  "photo_consent",
  // Raw audiometric inputs that may appear in server-side log extras
  "pta",
  "wrs",
  "durationYears",
  "duration_years",
]);

// URL patterns that indicate storage or signed-URL access.
const STORAGE_URL_RE = /\/storage\/v1\/object|ear-fit-photos|signedUrl=/;

/**
 * Pass as the `beforeSend` option to `Sentry.init()` in both client and
 * server configs. Returns null to drop an event, or the mutated event to send.
 */
export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  // Always strip request bodies — they contain clinical form submissions.
  if (event.request) {
    event.request = { ...event.request, data: undefined };

    // Drop storage / signed-URL requests to avoid leaking photo paths.
    if (event.request.url && STORAGE_URL_RE.test(event.request.url)) {
      event.request = {
        ...event.request,
        url: "[redacted-storage-url]",
        query_string: undefined,
      };
    }
  }

  // Scrub known PHI keys from any extra context attached by application code.
  if (event.extra) {
    const scrubbed: typeof event.extra = {};
    for (const [k, v] of Object.entries(event.extra)) {
      scrubbed[k] = PHI_KEYS.has(k) ? "[redacted]" : v;
    }
    event.extra = scrubbed;
  }

  // Strip storage URLs from breadcrumb navigation/fetch entries.
  // In Sentry v10, breadcrumbs is Breadcrumb[] directly (not { values: [] }).
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      const url = crumb.data?.url;
      if (typeof url === "string" && STORAGE_URL_RE.test(url)) {
        return { ...crumb, data: { ...crumb.data, url: "[redacted-storage-url]" } };
      }
      return crumb;
    });
  }

  return event;
}
