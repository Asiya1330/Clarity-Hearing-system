import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsoleNav } from "@/components/owner-console/console-nav";
import { ConsoleLogoutButton } from "@/components/owner-console/console-logout-button";
import { requireOwnerConsoleAccess } from "@/lib/owner-console/auth";
import {
  OWNER_CONSOLE_LOGIN_PATH,
  OWNER_CONSOLE_ROOT_PATH,
} from "@/lib/owner-console/constants";

export const metadata: Metadata = {
  title: "OViz Control Room",
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: OWNER_CONSOLE_ROOT_PATH, label: "Overview" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/clinics`, label: "Clinics" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/email-auditor`, label: "Email Auditor" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/kiosk-sessions`, label: "Kiosk Sessions" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/staff`, label: "Staff" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/audit`, label: "Audit Logs" },
  { href: `${OWNER_CONSOLE_ROOT_PATH}/health`, label: "Health" },
];

/**
 * Owner-console root layout, in its own route group so the clinic app nav never
 * renders here. The identity block reads the session (dynamic) inside a
 * Suspense boundary as required by cacheComponents; that read also runs the
 * access guard. Every PAGE additionally guards itself (defence in depth) — the
 * layout guard alone is never relied on to protect streamed page content.
 */
export default function OwnerConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="oviz-surface min-h-screen bg-brand-mist/30">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col gap-6 bg-brand-navy px-4 py-6 md:w-64">
          <div className="px-2">
            <p className="font-heading text-lg font-semibold text-brand-white">
              OViz Control Room
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-brand-white/50">
              Restricted operations
            </p>
          </div>

          <Suspense fallback={<NavSkeleton />}>
            <ConsoleNav items={NAV} />
          </Suspense>

          <div className="mt-auto border-t border-brand-white/10 px-2 pt-4">
            <Suspense fallback={<IdentitySkeleton />}>
              <ConsoleIdentity />
            </Suspense>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {NAV.map((item) => (
        <div
          key={item.href}
          className="h-9 w-full animate-pulse rounded-lg bg-brand-white/10"
        />
      ))}
    </div>
  );
}

function IdentitySkeleton() {
  return <div className="h-20 w-full animate-pulse rounded-md bg-brand-white/10" />;
}

async function ConsoleIdentity() {
  const ctx = await requireOwnerConsoleAccess();
  const roleLabel = ctx.isOwnerEmail
    ? "Owner"
    : ctx.role === "super_admin"
      ? "Super admin"
      : "Sub admin";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-xs text-brand-white/70">
        <span className="truncate" title={ctx.email}>
          {ctx.email}
        </span>
        <span className="inline-flex w-fit items-center rounded-md bg-brand-white/10 px-2 py-0.5 font-semibold text-brand-white">
          {roleLabel}
        </span>
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-200">
          MFA: {ctx.aal === "aal2" ? "active (AAL2)" : ctx.aal}
        </span>
      </div>
      <ConsoleLogoutButton loginPath={OWNER_CONSOLE_LOGIN_PATH} />
    </div>
  );
}
