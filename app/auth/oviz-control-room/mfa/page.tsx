import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ControlRoomMfa } from "@/components/owner-console/control-room-mfa";
import { requireOwnerConsoleUser } from "@/lib/owner-console/auth";
import {
  OWNER_CONSOLE_LOGIN_PATH,
  OWNER_CONSOLE_ROOT_PATH,
} from "@/lib/owner-console/constants";

export const metadata: Metadata = {
  title: "Verify",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Hidden MFA enrol/verify step. The guard (which reads the session — dynamic)
 * runs inside a Suspense boundary as required by cacheComponents; it confirms
 * the signed-in user is console-eligible WITHOUT requiring AAL2 (the user is
 * here precisely to obtain AAL2). An ineligible user is redirected away
 * generically.
 */
export default function Page() {
  return (
    <AuthShell eyebrow="Secure access" showBackLink={false}>
      <Suspense fallback={<MfaLoading />}>
        <MfaGate />
      </Suspense>
    </AuthShell>
  );
}

function MfaLoading() {
  return (
    <p className="text-center text-base text-brand-muted">
      Preparing secure verification…
    </p>
  );
}

async function MfaGate() {
  await requireOwnerConsoleUser();
  return (
    <ControlRoomMfa
      consolePath={OWNER_CONSOLE_ROOT_PATH}
      loginPath={OWNER_CONSOLE_LOGIN_PATH}
    />
  );
}
