import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default function RootPage() {
  return (
    <Suspense fallback={<Landing />}>
      <RootBody />
    </Suspense>
  );
}

async function RootBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .maybeSingle();

    redirect(profile?.clinic_id ? "/dashboard" : "/onboarding");
  }

  return <Landing />;
}

// The brand signature: a flat soundwave on the left resolving into a climbing
// line — "today's hearing, projected forward." Drawn on load (motion-safe).
function HeroRisingLine() {
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-28 w-full sm:h-36"
    >
      <path
        className="oviz-rise-path"
        d="M0,150 L60,150 L90,90 L120,170 L150,60 L180,170 L210,120 L300,120 C520,120 700,96 860,64 C1000,36 1120,22 1200,14"
        pathLength={1}
        fill="none"
        stroke="#008B8B"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Landing() {
  const projections = [
    {
      name: "Brain Battery",
      blurb: "How hard the brain is working to listen, today and over time.",
    },
    {
      name: "Word Understanding",
      blurb: "A clear scenario for everyday speech clarity.",
    },
    {
      name: "Social Radius",
      blurb: "How far comfortable hearing reaches in real situations.",
    },
    {
      name: "Partner Impact Mirror",
      blurb: "The shared, day-to-day effect on the people closest by.",
    },
    {
      name: "Real-Life Listening Map",
      blurb: "The patient's own listening priorities, ranked.",
    },
  ];

  return (
    <div className="oviz-surface min-h-screen bg-brand-white text-brand-navy">
      {/* Header */}
      <header className="border-b border-brand-line bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="OViz by OtoVantage"
            width={954}
            height={340}
            priority
            className="h-10 w-auto"
          />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-20 text-center">
        <p className="oviz-reveal oviz-eyebrow">OViz by OtoVantage</p>
        <h1 className="oviz-reveal mx-auto mt-4 max-w-3xl font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-brand-navy sm:text-6xl">
          Make today&apos;s hearing results
          <br className="hidden sm:block" /> impossible to ignore.
        </h1>
        <p className="oviz-reveal mx-auto mt-6 max-w-prose text-xl leading-relaxed text-brand-muted">
          OViz turns a clinic&apos;s hearing measurements into clear, evidence-
          informed projections you can talk through with a patient — Brain
          Battery, Word Understanding, Social Radius, and Partner Impact — in
          one clinician-led consult.
        </p>
        <div className="oviz-reveal mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Signature rising line */}
      <div className="mx-auto max-w-6xl px-6">
        <HeroRisingLine />
      </div>

      {/* What it projects */}
      <section className="border-t border-brand-line bg-brand-mist/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="oviz-eyebrow">In one consult</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand-navy">
              Five projections, one conversation
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projections.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm"
              >
                <h3 className="font-heading text-xl font-semibold text-brand-navy">
                  {p.name}
                </h3>
                <p className="mt-2 text-lg leading-relaxed text-brand-muted">
                  {p.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="border-t border-brand-line bg-brand-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="oviz-eyebrow">Plans</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand-navy">
              Choose the tier that fits your clinic
            </h2>
            <p className="mt-3 text-lg text-brand-muted">
              Set your plan during clinic setup. Change it any time.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <TierCard
              name="Starter"
              tagline="Core consult and report features."
              features={[
                "Consult wizard",
                "Brain Battery projection",
                "Word Understanding Scenario",
                "Social Radius",
                "Partner Impact Mirror",
                "Real-Life Listening Map",
                "Take-home report",
              ]}
            />
            <TierCard
              name="Pro"
              tagline="Everything in Starter, plus premium photo documentation."
              highlighted
              features={[
                "All Starter features",
                "Premium Ear Fit Photos (up to 4)",
                "Patient consent workflow",
                "Photos included in report",
                "Outcome tracking",
              ]}
            />
            <TierCard
              name="Enterprise"
              tagline="Multi-location clinics with advanced admin."
              features={[
                "All Pro features",
                "Multi-location management",
                "Advanced user roles",
                "Team invite workflow",
                "Priority support",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-line bg-brand-white">
        <div className="mx-auto max-w-prose px-6 py-10 text-center text-base text-brand-muted">
          <p className="font-medium text-brand-navy">
            OViz by OtoVantage — the strategic high ground for hearing
            healthcare operations.
          </p>
          <p className="mt-3">
            Educational projection based on published evidence and today&apos;s
            hearing results. Not a diagnosis, guarantee, or substitute for
            clinician judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TierCard({
  name,
  tagline,
  features,
  highlighted = false,
}: {
  name: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-7 shadow-sm ${
        highlighted
          ? "border-brand-teal bg-brand-tint/40 ring-1 ring-brand-teal"
          : "border-brand-line bg-brand-white"
      }`}
    >
      {highlighted ? (
        <span className="mb-3 inline-flex w-fit rounded-full bg-brand-teal px-3 py-1 text-sm font-semibold text-brand-white">
          Most popular
        </span>
      ) : (
        <span className="mb-3 h-7" aria-hidden="true" />
      )}
      <h3 className="font-heading text-2xl font-semibold text-brand-navy">
        {name}
      </h3>
      <p className="mt-1 text-lg leading-relaxed text-brand-muted">{tagline}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 text-lg text-brand-navy"
          >
            <Check
              className="mt-1 h-5 w-5 shrink-0 text-brand-teal-700"
              aria-hidden="true"
            />
            {f}
          </li>
        ))}
      </ul>
      <Button
        asChild
        size="lg"
        variant={highlighted ? "default" : "outline"}
        className="mt-7 w-full"
      >
        <Link href="/auth/sign-up">Get started</Link>
      </Button>
    </div>
  );
}
