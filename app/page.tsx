import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Check,
  ClipboardCheck,
  Ear,
  Shield,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/report/reveal-on-scroll";
import { Reveal } from "@/components/report/reveal";

// Public marketing root: pure static content for everyone. Sending authenticated
// users into the app is handled in the proxy (see lib/supabase/proxy.ts) — it
// must be, because with Cache Components this page's static shell is served with
// a 200 before any page-level code runs, so a redirect() here would be demoted to
// a client-side navigation that flashes the marketing page and mis-routes.
export default function RootPage() {
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

  const roles = [
    {
      icon: Stethoscope,
      title: "Audiologists",
      blurb:
        "Turn your diagnostic findings into a projection patients can see and talk through — clinician-led, evidence-informed, never automated advice.",
    },
    {
      icon: Ear,
      title: "Hearing Instrument Specialists",
      blurb:
        "Move the conversation from clinical results to everyday life, so patients grasp what today's findings mean for the moments they care about.",
    },
    {
      icon: Building2,
      title: "Clinic Owners",
      blurb:
        "Give every chair and every location the same supplier-neutral, evidence-based consult — a consistent experience you can stand behind.",
    },
    {
      icon: ClipboardCheck,
      title: "Clinic Managers",
      blurb:
        "Standardize the patient conversation and keep every visit on one clear, repeatable path from results to take-home report.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Measure",
      blurb: "Start from the hearing results your clinic already captures.",
    },
    {
      step: "02",
      title: "Project",
      blurb:
        "Clarity-Hearing-system turns them into clear, evidence-informed projections in one clinician-led consult.",
    },
    {
      step: "03",
      title: "Discuss",
      blurb:
        "Talk through what they mean together, then send the patient home with a take-home report.",
    },
  ];

  return (
    <div className="oviz-surface min-h-screen bg-brand-white text-brand-navy">
      {/* Header */}
      <header className="border-b border-brand-line bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Image
            src="/brand/oviz-by-otovantage-logo.png"
            alt="Clarity-Hearing-system"
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
        <p className="oviz-eyebrow">Clarity-Hearing-system</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-brand-navy sm:text-6xl">
          Make today&apos;s hearing results
          <br className="hidden sm:block" /> impossible to ignore.
        </h1>
        <p className="mx-auto mt-6 max-w-prose text-xl leading-relaxed text-brand-muted">
          Clarity-Hearing-system turns a clinic&apos;s hearing measurements into clear, evidence-
          informed projections you can talk through with a patient — Brain
          Battery, Word Understanding, Social Radius, and Partner Impact — in
          one clinician-led consult.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        {/* Value-prop trust bar — directly under the hero CTAs. The three
            labels + literal "|" separators read as one string. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-base font-medium text-brand-navy sm:text-lg">
          <span className="inline-flex items-center gap-2">
            <Check
              className="h-5 w-5 shrink-0 text-brand-teal-700"
              aria-hidden="true"
            />
            Supplier-neutral
          </span>
          <span className="text-brand-line-strong" aria-hidden="true">
            {" | "}
          </span>
          <span className="inline-flex items-center gap-2">
            <Shield
              className="h-5 w-5 shrink-0 text-brand-teal-700"
              aria-hidden="true"
            />
            Private by design
          </span>
          <span className="text-brand-line-strong" aria-hidden="true">
            {" | "}
          </span>
          <span className="inline-flex items-center gap-2">
            <TrendingUp
              className="h-5 w-5 shrink-0 text-brand-teal-700"
              aria-hidden="true"
            />
            Built on evidence
          </span>
        </div>
      </section>

      {/* Signature rising line */}
      <div className="mx-auto max-w-6xl px-6">
        <HeroRisingLine />
      </div>

      {/* Built for your role — four cards, each its own scroll reveal
          (fade + rise) via <RevealOnScroll>. */}
      <section className="border-t border-brand-line bg-brand-mist/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="oviz-eyebrow">Built for your role</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand-navy">
              One consult, made for the whole clinic
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <RevealOnScroll key={r.title} className="h-full" threshold={0.15}>
                <RoleCard icon={r.icon} title={r.title} blurb={r.blurb} />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — static three-step band, no entrance animation. */}
      <section className="border-t border-brand-line bg-brand-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="oviz-eyebrow">How it works</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand-navy">
              From today&apos;s results to a real conversation
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li
                key={s.step}
                className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm"
              >
                <span className="font-heading text-2xl font-semibold text-brand-teal-700">
                  {s.step}
                </span>
                <h3 className="mt-3 font-heading text-xl font-semibold text-brand-navy">
                  {s.title}
                </h3>
                <p className="mt-2 text-lg leading-relaxed text-brand-muted">
                  {s.blurb}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Five projections — one <Reveal> scope; each card's decorative teal
          accent bar grows (scaleX) on reveal via .oviz-anim-grow-w, staggered
          with an inline --oviz-reveal-delay. */}
      <section className="border-t border-brand-line bg-brand-mist/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="oviz-eyebrow">In one consult</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand-navy">
              Five projections, one conversation
            </h2>
          </div>
          <Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projections.map((p, i) => (
                <div
                  key={p.name}
                  className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm"
                >
                  <div
                    className="oviz-anim-grow-w h-1 w-12 rounded-full bg-brand-teal"
                    style={
                      {
                        "--oviz-reveal-delay": `${i * 120}ms`,
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-lg leading-relaxed text-brand-muted">
                    {p.blurb}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
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
            Clarity-Hearing-system — the strategic high ground for hearing
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

function RoleCard({
  icon: Icon,
  title,
  blurb,
}: {
  icon: LucideIcon;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand-teal-700">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h3>
      <p className="mt-2 text-lg leading-relaxed text-brand-muted">{blurb}</p>
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
