import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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

function Landing() {
  return (
    <div className="min-h-screen bg-brand-white">
      {/* Header */}
      <header className="border-b border-brand-slate/15 bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="OViz by OtoVantage"
            width={954}
            height={340}
            priority
            className="h-10 w-auto"
          />
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-brand-navy hover:text-brand-teal"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-md bg-brand-teal px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-teal/90"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
          OViz by OtoVantage
        </p>
        <h1 className="text-5xl font-bold leading-tight text-brand-navy">
          Evidence-informed hearing
          <br />
          consult for clinicians
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-slate">
          OViz is a B2B hearing-clinic consult and patient-education platform.
          It generates educational projections — Brain Battery, Word
          Understanding, Social Radius, and Partner Impact — to support
          clinician-led consultations.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-brand-slate/70">
          Educational projection based on published evidence and today&apos;s
          hearing results. Not a diagnosis, guarantee, or substitute for
          clinician judgment.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-brand-teal px-8 py-3 text-sm font-medium text-brand-white hover:bg-brand-teal/90"
          >
            Create account
          </Link>
          <Link
            href="/auth/login"
            className="rounded-md border border-brand-navy/20 px-8 py-3 text-sm font-medium text-brand-navy hover:border-brand-teal hover:text-brand-teal"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Tier cards */}
      <section className="border-t border-brand-slate/15 bg-brand-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-2 text-center text-3xl font-bold text-brand-navy">
            Plans
          </h2>
          <p className="mb-10 text-center text-brand-slate">
            Choose the tier that fits your clinic during setup.
          </p>
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
      <footer className="border-t border-brand-slate/15 bg-brand-white">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-brand-slate">
          <p>
            OViz by OtoVantage &mdash; The Strategic High Ground for Hearing
            Healthcare Operations.
          </p>
          <p className="mt-2 text-brand-slate/60">
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
      className={`rounded-lg border p-6 ${
        highlighted
          ? "border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal"
          : "border-brand-slate/20 bg-brand-white"
      }`}
    >
      {highlighted && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-teal">
          Most popular
        </p>
      )}
      <h3 className="text-xl font-bold text-brand-navy">{name}</h3>
      <p className="mt-1 text-sm text-brand-slate">{tagline}</p>
      <ul className="mt-5 flex flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-brand-slate">
            <span className="mt-px text-brand-teal">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href="/auth/sign-up"
          className={`block w-full rounded-md px-4 py-2 text-center text-sm font-medium ${
            highlighted
              ? "bg-brand-teal text-brand-white hover:bg-brand-teal/90"
              : "border border-brand-navy/20 text-brand-navy hover:border-brand-teal hover:text-brand-teal"
          }`}
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
