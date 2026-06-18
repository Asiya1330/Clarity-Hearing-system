import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthShell eyebrow="Something went wrong">
      <Card>
        <CardHeader>
          <CardTitle>Sorry, something went wrong.</CardTitle>
          <CardDescription>
            The link or action couldn&apos;t be completed. You can head back to
            sign in and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-7">
          {/* The error code comes from searchParams (uncached, per-request), so
              it must be read inside a Suspense boundary — required by Next's
              Cache Components build. */}
          <Suspense
            fallback={
              <p className="text-lg leading-relaxed text-brand-navy">
                Checking what happened…
              </p>
            }
          >
            <ErrorCode searchParams={searchParams} />
          </Suspense>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">Go to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

async function ErrorCode({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return params?.error ? (
    <p className="text-lg leading-relaxed text-brand-navy">
      Error code:{" "}
      <span className="font-semibold text-brand-teal-700">{params.error}</span>
    </p>
  ) : (
    <p className="text-lg leading-relaxed text-brand-navy">
      An unspecified error occurred.
    </p>
  );
}
