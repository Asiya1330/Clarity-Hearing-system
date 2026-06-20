import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ControlRoomLogin } from "@/components/owner-console/control-room-login";
import {
  OWNER_CONSOLE_MFA_PATH,
} from "@/lib/owner-console/constants";

// Hidden surface — never indexed, never advertised.
export const metadata: Metadata = {
  title: "Secure access",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Hidden owner/staff access landing page. Neutral copy — it never reveals that
 * this is the SaaS owner console, who the owner is, or that staff exist. All
 * real authorization happens server-side (proxy + guards) after MFA.
 */
export default function Page() {
  return (
    <AuthShell eyebrow="Secure access" showBackLink={false}>
      <ControlRoomLogin mfaPath={OWNER_CONSOLE_MFA_PATH} />
    </AuthShell>
  );
}
