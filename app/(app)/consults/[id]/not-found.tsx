import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="font-heading text-3xl font-semibold text-brand-navy">
        Consult not found
      </h1>
      <p className="text-lg leading-relaxed text-brand-muted">
        We couldn&apos;t find a saved consult at this address. It may have been
        removed, or the link may be incomplete.
      </p>
      <Button asChild size="lg">
        <Link href="/dashboard">Return to dashboard</Link>
      </Button>
    </div>
  );
}
