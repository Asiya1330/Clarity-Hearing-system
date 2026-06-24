/**
 * Environment / integration configuration status for the console Overview and
 * Health pages. SERVER-ONLY.
 *
 * Reports ONLY presence/absence (configured | missing). Secret VALUES are never
 * read into the returned object, logged, or sent to the client.
 */

import { isUsingLegacyServiceRoleKey } from "@/lib/supabase/admin";

export interface ConfigCheck {
  key: string;
  label: string;
  configured: boolean;
  /** Non-fatal advisory (e.g. legacy fallback in use). */
  warning?: string;
}

function present(name: string): boolean {
  return !!process.env[name];
}

export function getServiceRoleConfig(): ConfigCheck {
  const configured = present("SUPABASE_SERVICE_ROLE_KEY") || isUsingLegacyServiceRoleKey();
  return {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service role",
    configured,
    warning: isUsingLegacyServiceRoleKey()
      ? "Using deprecated NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY fallback — migrate the Vercel env var to SUPABASE_SERVICE_ROLE_KEY."
      : undefined,
  };
}

export function getConfigChecks(): ConfigCheck[] {
  return [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase URL",
      configured: present("NEXT_PUBLIC_SUPABASE_URL"),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      label: "Supabase publishable key",
      configured: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    },
    getServiceRoleConfig(),
    {
      key: "RESEND_API_KEY",
      label: "Resend API key",
      configured: present("RESEND_API_KEY"),
    },
    {
      key: "INTAKE_EMAIL_FROM",
      label: "Intake email from-address",
      configured: present("INTAKE_EMAIL_FROM"),
    },
    {
      key: "SENTRY_DSN",
      label: "Sentry DSN",
      configured: present("SENTRY_DSN") || present("NEXT_PUBLIC_SENTRY_DSN"),
    },
    {
      key: "STRIPE_SECRET_KEY",
      label: "Stripe secret key",
      configured: present("STRIPE_SECRET_KEY"),
    },
    {
      key: "OWNER_CONSOLE_AUDIT_HASH_SALT",
      label: "Audit hash salt",
      configured: present("OWNER_CONSOLE_AUDIT_HASH_SALT"),
      warning: present("OWNER_CONSOLE_AUDIT_HASH_SALT")
        ? undefined
        : "Not set — audit IP/UA hashes use a non-secret constant salt. Set a long random value in production.",
    },
  ];
}

/** Compact integration flags for the Overview cards. */
export function getIntegrationStatus() {
  return {
    resendConfigured: present("RESEND_API_KEY") && present("INTAKE_EMAIL_FROM"),
    stripeConfigured: present("STRIPE_SECRET_KEY"),
    sentryConfigured: present("SENTRY_DSN") || present("NEXT_PUBLIC_SENTRY_DSN"),
    usingLegacyServiceRoleKey: isUsingLegacyServiceRoleKey(),
  };
}
