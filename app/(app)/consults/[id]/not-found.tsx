import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-bold text-brand-navy">Consult not found</h1>
      <p className="text-brand-slate">
        We could not find a saved consult at this address.
      </p>
      <Button
        asChild
        className="h-11 bg-brand-teal px-5 text-brand-white hover:bg-brand-teal/90"
      >
        <Link href="/dashboard">Return to dashboard</Link>
      </Button>
    </div>
  );
}
