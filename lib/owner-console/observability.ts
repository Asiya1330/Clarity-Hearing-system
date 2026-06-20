/**
 * Owner-console Sentry tagging. Server-only by usage.
 *
 * Every event raised from the console surface is tagged so it can be filtered
 * in Sentry and is unambiguously attributed to the admin dashboard:
 *   surface: "owner_console"
 *   admin_dashboard: "true"
 *   owner_console_action: <action name> (when known)
 *
 * The global PHI filter (lib/sentry/phi-filter.ts) still runs in beforeSend, so
 * even if a caller passes a value that turns out to be sensitive it is scrubbed
 * before leaving the process. By convention, only non-PHI diagnostics (ids,
 * codes, counts, booleans) should be put in `extra`.
 */

import * as Sentry from "@sentry/nextjs";

type Extra = Record<string, unknown>;

function applyTags(scope: Sentry.Scope, action?: string, extra?: Extra) {
  scope.setTag("surface", "owner_console");
  scope.setTag("admin_dashboard", "true");
  if (action) scope.setTag("owner_console_action", action);
  if (extra) scope.setContext("owner_console", extra);
}

export function captureOwnerConsoleException(
  error: unknown,
  action?: string,
  extra?: Extra,
): void {
  Sentry.withScope((scope) => {
    applyTags(scope, action, extra);
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
    );
  });
}

export function captureOwnerConsoleMessage(
  message: string,
  action?: string,
  level: Sentry.SeverityLevel = "warning",
  extra?: Extra,
): void {
  Sentry.withScope((scope) => {
    applyTags(scope, action, extra);
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}
