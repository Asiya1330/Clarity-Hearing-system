import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-2 text-brand-slate">
          Start an educational consult or revisit a previous one.
        </p>
      </header>

      <section className="rounded-lg border border-brand-slate/20 bg-brand-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl text-brand-navy">New consult</h2>
            <p className="mt-1 text-brand-slate">
              Capture clinician inputs, patient sliders, and listening goals to
              generate today&apos;s projection.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="h-12 bg-brand-teal px-8 text-brand-white hover:bg-brand-teal/90"
            data-testid="start-consult-btn"
          >
            <Link href="/consults/new">
              Start consult
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl text-brand-navy">Recent consults</h2>
        <div className="rounded-lg border border-dashed border-brand-slate/30 bg-brand-white p-10 text-center text-brand-slate">
          Saved consults will appear here.
        </div>
      </section>
    </div>
  );
}
