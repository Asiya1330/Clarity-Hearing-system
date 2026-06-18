import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

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
          {params?.error ? (
            <p className="text-lg leading-relaxed text-brand-navy">
              Error code:{" "}
              <span className="font-semibold text-brand-teal-700">
                {params.error}
              </span>
            </p>
          ) : (
            <p className="text-lg leading-relaxed text-brand-navy">
              An unspecified error occurred.
            </p>
          )}
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
