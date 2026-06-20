import type { Metadata } from "next";
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
 * Hidden MFA enrol/verify step. The server guard confirms the signed-in user is
 * console-eligible (owner email OR app_metadata console access) WITHOUT
 * requiring AAL2 — the user is here precisely to obtain AAL2. An ineligible
 * user is redirected away generically (no hint that this console exists).
 */
export default async function Page() {
  await requireOwnerConsoleUser();
  return (
    <AuthShell eyebrow="Secure access" showBackLink={false}>
      <ControlRoomMfa
        consolePath={OWNER_CONSOLE_ROOT_PATH}
        loginPath={OWNER_CONSOLE_LOGIN_PATH}
      />
    </AuthShell>
  );
}
