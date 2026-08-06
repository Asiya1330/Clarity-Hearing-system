import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Account paused",
  robots: { index: false, follow: false },
};

/**
 * Shown when a clinic's account is suspended. Generic, non-alarming copy; the
 * clinic app routes redirect here via the (app) layout guard. No clinical data
 * is reachable from this page.
 */
export default function AccountSuspendedPage() {
  return (
    <AuthShell eyebrow="Account paused" showBackLink={false}>
      <Card>
        <CardHeader>
          <CardTitle>Your clinic account is paused</CardTitle>
          <CardDescription>
            Access to Clarity-Hearing-system is temporarily paused for your clinic. Please contact
            Clarity-Hearing-system support to restore access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-brand-muted">
            If you believe this is a mistake, reach out and our team will help
            sort it out.
          </p>
          <LogoutButton />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
