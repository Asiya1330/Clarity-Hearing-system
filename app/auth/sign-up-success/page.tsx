import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <AuthShell eyebrow="Almost there">
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            Confirm your address to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed text-brand-muted">
            We sent a confirmation link to your email. Open it to verify your
            account, then sign in to finish setting up your clinic.
          </p>
          <div className="mt-6 text-center text-base text-brand-muted">
            Already confirmed?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-brand-teal-700 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
