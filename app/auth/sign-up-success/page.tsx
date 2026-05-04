import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center px-4 py-2">
            <Image
              src="/brand/oviz-by-otovantage-logo.png"
              alt="OViz by OtoVantage"
              width={954}
              height={340}
              priority
              className="h-16 w-auto"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-brand-navy">
                Check your email
              </CardTitle>
              <CardDescription className="text-brand-slate">
                Confirm your address to activate your OViz account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-brand-slate">
                We sent a confirmation link to your email address. Click the
                link to verify your account, then sign in to complete setup.
              </p>
              <div className="mt-6 text-center text-sm">
                Already confirmed?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-brand-teal underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
