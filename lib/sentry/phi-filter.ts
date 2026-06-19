import type { Breadcrumb, ErrorEvent, Event } from "@sentry/nextjs";
// TransactionEvent is defined in @sentry/core (it extends Event) and is not
// re-exported by name from @sentry/nextjs; import it from its canonical home.
import type { TransactionEvent } from "@sentry/core";

/**
 * PHI / PII scrubbing for Sentry events.
 *
 * Applied via `beforeSend` (errors) and `beforeSendTransaction` (performance
 * spans) on the client, server, and edge configs. This is the last line of
 * defence before any payload leaves the process for the Sentry cloud.
 *
 * Strategy — defence in depth:
 *   1. Recursive key sanitisation: any object key whose name matches a PHI/PII
 *      or secret fragment has its entire value (string, number, object, array)
 *      replaced, no matter how deeply nested.
 *   2. Pattern sanitisation: every free-text string (exception messages, DB
 *      exception dumps, breadcrumb messages, span descriptions, tag values) is
 *      scrubbed for emails, phone numbers, and long numeric identifiers
 *      (MRN / health-card / patient-id style runs).
 *   3. Storage-path/signed-URL redaction on URLs.
 *   4. Request bodies are dropped wholesale (they carry clinical submissions).
 *
 * Erring toward over-redaction is intentional for a healthcare app: it is
 * always safer to lose a debugging detail than to leak a patient identifier.
 */

const REDACTED = "[redacted-phi]";

// Case-insensitive key fragments that mark a field as carrying PHI/PII — or a
// secret that should never reach Sentry. A key matches if it CONTAINS any
// fragment, so "patient_first_name", "patientEmail", "air_thresholds" all hit.
const SENSITIVE_KEY_FRAGMENTS = [
  // Patient identity
  "patient",
  "full_name",
  "fullname",
  "first_name",
  "firstname",
  "given_name",
  "last_name",
  "lastname",
  "family_name",
  "surname",
  "initial",
  "email",
  "phone",
  "mobile",
  "telephone",
  "address",
  "postal",
  "zip",
  "dob",
  "birth",
  "date_of_birth",
  "ssn",
  "mrn",
  "health_card",
  "healthcard",
  "insurance",
  "patient_id",
  "patient_ref",
  "patient_reference",
  // Free-text clinical content
  "note",
  "comment",
  // Audiometric / clinical inputs + model outputs
  "audiogram",
  "threshold",
  "frequenc",
  "pta",
  "wrs",
  "duration_years",
  "durationyears",
  "outputs",
  "patient_responses",
  // Clinic / report leakage vectors
  "report_footer",
  "storage_path",
  "signed_url",
  "signedurl",
  // Secrets / auth material
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "secret",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "service_role",
];

// Keys that contain a fragment above but are demonstrably NOT sensitive, kept
// to avoid nuking useful diagnostics.
const SAFE_KEY_EXCEPTIONS = new Set(["filename", "file_name", "pathname"]);

// URL patterns that indicate storage or signed-URL access.
const STORAGE_URL_RE = /\/storage\/v1\/object|ear-fit-photos|signedUrl=|token=/i;

// High-confidence PII value patterns applied to free text.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Phone-like: a leading digit/+ followed by 7+ more digits and separators.
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
// Bare numeric runs of 7+ digits (health-card / MRN / patient-id). UUIDs and
// dates survive (they contain hyphens / are shorter groups).
const LONG_NUMBER_RE = /\b\d{7,}\b/g;

const MAX_DEPTH = 8;

function keyIsSensitive(key: string): boolean {
  const k = key.toLowerCase();
  if (SAFE_KEY_EXCEPTIONS.has(k)) return false;
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => k.includes(fragment));
}

/** Redact PII patterns inside a free-text string. */
function scrubString(value: string): string {
  if (STORAGE_URL_RE.test(value) && /https?:\/\//.test(value)) {
    return "[redacted-storage-url]";
  }
  return value
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(LONG_NUMBER_RE, "[redacted-id]");
}

/**
 * Recursively scrub an arbitrary value. If `keyHint` names a sensitive field,
 * the whole value is redacted; otherwise strings are pattern-scrubbed and
 * objects/arrays are walked.
 */
function scrubValue(value: unknown, keyHint: string | undefined, depth: number): unknown {
  if (keyHint !== undefined && keyIsSensitive(keyHint)) return REDACTED;
  if (value === null || value === undefined) return value;
  if (depth >= MAX_DEPTH) return "[redacted-depth]";

  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, keyHint, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = keyIsSensitive(k) ? REDACTED : scrubValue(v, k, depth + 1);
    }
    return out;
  }

  return value;
}

function scrubRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!record) return record;
  return scrubValue(record, undefined, 0) as Record<string, unknown>;
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const next: Breadcrumb = { ...crumb };
  if (typeof next.message === "string") next.message = scrubString(next.message);
  if (next.data) next.data = scrubValue(next.data, undefined, 0) as Breadcrumb["data"];
  return next;
}

/**
 * Core scrubber shared by error and transaction events. Mutates and returns a
 * scrubbed copy of every field that can carry PHI/PII.
 */
function scrubEvent<T extends Event>(event: T): T {
  // 1. Request: drop the body outright; scrub URL / query / headers.
  if (event.request) {
    const req = { ...event.request, data: undefined };
    if (req.url && STORAGE_URL_RE.test(req.url)) {
      req.url = "[redacted-storage-url]";
      req.query_string = undefined;
    }
    if (req.headers) {
      req.headers = scrubValue(req.headers, undefined, 0) as typeof req.headers;
    }
    if (req.cookies) req.cookies = undefined;
    event.request = req;
  }

  // 2. Top-level message.
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }

  // 3. Exception values: messages + captured stack-frame locals.
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => {
      const next = { ...ex };
      if (typeof next.value === "string") next.value = scrubString(next.value);
      if (next.stacktrace?.frames) {
        next.stacktrace = {
          ...next.stacktrace,
          frames: next.stacktrace.frames.map((frame) =>
            frame.vars
              ? { ...frame, vars: scrubValue(frame.vars, undefined, 0) as typeof frame.vars }
              : frame,
          ),
        };
      }
      return next;
    });
  }

  // 4. Extra / contexts.
  if (event.extra) event.extra = scrubRecord(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrubRecord(event.contexts) as typeof event.contexts;

  // 5. Tags (string map) — pattern-scrub each value.
  if (event.tags) {
    const tags: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(event.tags)) {
      tags[k] = keyIsSensitive(k) ? REDACTED : typeof v === "string" ? scrubString(v) : v;
    }
    event.tags = tags as typeof event.tags;
  }

  // 6. User: keep the opaque id, strip identifying fields.
  if (event.user) {
    event.user = {
      ...event.user,
      email: event.user.email ? REDACTED : undefined,
      username: event.user.username ? REDACTED : undefined,
      ip_address: undefined,
    };
  }

  // 7. Breadcrumbs (Sentry v10: Breadcrumb[] directly).
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }

  return event;
}

/**
 * `beforeSend` for error events. Returns the scrubbed event, or null to drop.
 */
export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  return scrubEvent(event);
}

/**
 * `beforeSendTransaction` for performance/trace events. Scrubs span
 * descriptions and span data in addition to the shared event fields, so route
 * params or DB statements captured in spans cannot leak PHI.
 */
export function beforeSendTransaction(
  event: TransactionEvent,
): TransactionEvent | null {
  const scrubbed = scrubEvent(event);

  if (typeof scrubbed.transaction === "string") {
    scrubbed.transaction = scrubString(scrubbed.transaction);
  }

  if (scrubbed.spans) {
    scrubbed.spans = scrubbed.spans.map((span) => {
      const next = { ...span };
      if (typeof next.description === "string") {
        next.description = scrubString(next.description);
      }
      if (next.data) {
        next.data = scrubValue(next.data, undefined, 0) as typeof next.data;
      }
      return next;
    });
  }

  return scrubbed;
}
