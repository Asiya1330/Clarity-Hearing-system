/**
 * Kiosk — "Main Client Information Input Home Page"
 *
 * The resting screen a clinic tablet shows between patients. Presentation only:
 * clinic identity is read from query params with neutral placeholder fallbacks,
 * so it can be wired to real data later with NO backend change.
 *
 * Accepted query params (all optional):
 *   clinic    — clinic name              (default: "Your clinic")
 *   clinician — clinician name           (default: "Your clinician")
 *   location  — clinic location          (default: "Your clinic location")
 *   logo      — clinic logo image URL    (default: dashed placeholder slot)
 *   start     — begin-CTA href           (default: "/consults/start")
 *   patient   — patient first name       (optional; greeting wired in a later prompt)
 *
 * Example:
 *   /kiosk?clinic=Bayview%20Hearing&location=Toronto&clinician=Dr.%20Lee
 */
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Hand,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { RisingLine } from "@/components/app/rising-line";
import { Button } from "@/components/ui/button";
import { KioskClock } from "@/components/kiosk/kiosk-clock";
import { KioskLogo } from "@/components/kiosk/kiosk-logo";

interface KioskSearchParams {
  clinic?: string;
  clinician?: string;
  location?: string;
  logo?: string;
  start?: string;
  patient?: string;
}

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Hand,
    title: "Get comfortable",
    body: "Settle in and have a seat. There's no rush — this only takes a few minutes.",
  },
  {
    icon: ListChecks,
    title: "Answer a few questions",
    body: "Tell us how your hearing feels in everyday moments by tapping simple sliders.",
  },
  {
    icon: CheckCircle2,
    title: "Review together",
    body: "Your clinician walks through what your answers mean and what comes next.",
  },
];

export default function KioskPage({
  searchParams,
}: {
  searchParams: Promise<KioskSearchParams>;
}) {
  // searchParams is uncached (per-request), so the screen that reads it must
  // sit inside a Suspense boundary — required by Next's Cache Components build.
  return (
    <Suspense fallback={<KioskFallback />}>
      <KioskHome searchParams={searchParams} />
    </Suspense>
  );
}

function KioskFallback() {
  return (
    <div className="oviz-surface flex min-h-svh items-center justify-center bg-brand-mist/40 text-brand-navy">
      <p className="text-lg text-brand-muted">Loading…</p>
    </div>
  );
}

async function KioskHome({
  searchParams,
}: {
  searchParams: Promise<KioskSearchParams>;
}) {
  const params = await searchParams;
  const clinic = params.clinic || "Your clinic";
  const clinician = params.clinician || "Your clinician";
  const location = params.location || "Your clinic location";
  const start = params.start || "/consults/start";
  const logo = params.logo;
  const patient = params.patient?.trim();

  // Presentation only: when a named kiosk session is launched (?patient=…),
  // greet the client by name and mention their clinic/clinician; otherwise fall
  // back to the generic clinic welcome.
  const heading = patient ? `Welcome, ${patient}` : `Welcome to ${clinic}`;
  const lead = patient
    ? `${clinician} at ${clinic} will see you shortly. When you're ready, tap below to start a short, comfortable check-in about your hearing.`
    : `${clinician} will see you shortly. When you're ready, tap below to start a short, comfortable check-in about your hearing.`;

  return (
    <div className="oviz-surface flex min-h-svh flex-col bg-brand-mist/40 text-brand-navy">
      {/* Top bar: logo slot · clinic identity · live clock */}
      <header className="bg-brand-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            {/* serverLogo = the ?logo= override; otherwise KioskLogo falls back
                to the locally-saved clinic logo, then a dashed placeholder. */}
            <KioskLogo serverLogo={logo} clinic={clinic} />
            <div>
              <p className="text-xl font-semibold text-brand-navy">{clinic}</p>
              <p className="text-sm text-brand-muted">{location}</p>
            </div>
          </div>
          <KioskClock className="text-right" />
        </div>
        {/* Thin rising-line accent under the bar */}
        <RisingLine className="h-2 w-full" />
      </header>

      {/* Welcome + instructions */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            {heading}
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-xl leading-relaxed text-brand-muted">
            {lead}
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="relative flex flex-col rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm"
              >
                <span
                  className="absolute right-6 top-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-base font-semibold tabular-nums text-brand-teal-700"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-teal-700">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
                  {s.title}
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-brand-muted">
                  {s.body}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Oversized primary CTA (80px tall) */}
        <div className="mt-12 flex justify-center">
          <Button
            asChild
            className="h-20 w-full max-w-xl px-12 text-2xl [&_svg]:size-7"
          >
            <Link href={start}>
              Tap here to begin
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="px-6 pb-8 text-center text-sm text-brand-muted">
        Educational projection based on published evidence and today&apos;s
        hearing results. Not a diagnosis, guarantee, or substitute for clinician
        judgment.
      </footer>
    </div>
  );
}
