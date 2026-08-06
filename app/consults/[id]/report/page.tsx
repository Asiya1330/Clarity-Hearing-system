import {
  BatteryCharging,
  Clock,
  MapPinned,
  MessagesSquare,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

import { RisingLine } from "@/components/app/rising-line";
import { BackLink } from "@/components/BackLink";
import { ListeningLiftMap } from "@/components/consult/listening-lift-map";
import { AtAGlance } from "@/components/report/at-a-glance";
import {
  BrainBatteryViz,
  PartnerImpactViz,
  SocialRadiusViz,
  WordUnderstandingViz,
} from "@/components/report/impact-visuals";
import { PresentationMode } from "@/components/report/presentation-mode";
import { PrintButton } from "@/components/report/print-button";
import { Reveal } from "@/components/report/reveal";
import { SectionCard } from "@/components/report/section-card";
import type { ImpactOutputs } from "@/lib/calculators/impact";
import { calculateListeningLift } from "@/lib/calculators/listening-lift";
import { createClient } from "@/lib/supabase/server";
import type { ConsultInput } from "@/lib/zod/consult";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PhotoUrl {
  url: string;
}

export default function ReportPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportBody params={params} />
    </Suspense>
  );
}

function ReportSkeleton() {
  return (
    <main className="min-h-screen bg-brand-white text-brand-navy">
      <div className="mx-auto max-w-xl px-8 py-20">
        <h1 className="mb-3 font-heading text-2xl font-bold text-brand-navy">
          Clarity-Hearing-system Hearing Impact Summary
        </h1>
        <p className="text-brand-muted">Preparing report…</p>
      </div>
    </main>
  );
}

async function ReportBody({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <Blocked />;
  }

  const { data: modelRun, error: modelRunError } = await supabase
    .from("model_runs")
    .select("inputs, outputs, model_version, created_at")
    .eq("consult_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (modelRunError || !modelRun) {
    return <Blocked />;
  }

  const { data: consult, error: consultError } = await supabase
    .from("consults")
    .select(
      "id, patient_reference, patient_name, consult_date, is_follow_up, photo_consent, clinic_id, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (consultError || !consult) {
    return <Blocked />;
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, report_footer")
    .eq("id", consult.clinic_id)
    .maybeSingle();
  const clinicName = clinic?.name ?? "Your clinic";
  const reportFooter = (clinic as { report_footer?: string | null } | null)
    ?.report_footer;

  const showPhotosSection = consult.photo_consent === true;
  let photos: PhotoUrl[] = [];
  if (showPhotosSection) {
    const { data: photoRows } = await supabase
      .from("ear_fit_photos")
      .select("storage_path")
      .eq("consult_id", id)
      .eq("upload_status", "uploaded")
      .order("created_at", { ascending: true });

    if (photoRows && photoRows.length > 0) {
      const signed = await Promise.all(
        photoRows.map(async (row) => {
          const { data } = await supabase.storage
            .from("ear-fit-photos")
            .createSignedUrl(row.storage_path, 3600);
          return data?.signedUrl;
        }),
      );
      photos = signed
        .filter((u): u is string => typeof u === "string")
        .map((url) => ({ url }));
    }
  }

  const inputs = modelRun.inputs as ConsultInput;
  const outputs = modelRun.outputs as ImpactOutputs;
  const modelVersion = modelRun.model_version ?? outputs.modelVersion;

  const displayName =
    (consult as { patient_name?: string | null }).patient_name ||
    consult.patient_reference ||
    null;
  const displayDate = (consult as { consult_date?: string | null })
    .consult_date;
  const isFollowUp =
    (consult as { is_follow_up?: boolean | null }).is_follow_up ?? false;

  const effortPct = Math.round(outputs.brainBattery.brainLoad);
  const wrsPct = Math.round(outputs.wordUnderstanding.current);
  const wrsTreated = Math.round(outputs.wordUnderstanding.treated5Year);
  const wrsUntreated = Math.round(outputs.wordUnderstanding.untreated5Year);
  const repeats = Math.round(outputs.partnerImpact.repeatsPerDay);
  // Reuse the same calculator + inputs the map renders from, so the takeaway's
  // best situation and relief magnitude match the card exactly (no new math).
  const lift = calculateListeningLift(
    outputs.listeningMap.topGoals,
    outputs.wordUnderstanding.current,
  );
  const bestResponder = lift.bestResponder;
  const bestRelief = lift.goals.find((g) => g.name === bestResponder)?.relief;

  return (
    <main className="min-h-screen bg-brand-white text-brand-navy print:bg-white">
      <div className="mx-auto max-w-[880px] px-8 py-10 print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <BackLink href={`/consults/${id}`} />
          <div className="flex items-center gap-3">
            <PresentationMode outputs={outputs} clinicName={clinicName} />
            <PrintButton />
          </div>
        </div>

        <header className="mb-8 border-b-2 border-brand-navy pb-6 print:break-after-avoid">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal-700">
                {clinicName}
              </p>
              <h1
                className="font-heading text-3xl font-bold text-brand-navy"
                data-testid="report-title"
              >
                Clarity-Hearing-system Hearing Impact Summary
              </h1>
              <p className="text-base text-brand-muted">
                Prepared by {clinicName} using Clarity-Hearing-system.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-base text-brand-muted">
                {displayName && (
                  <span>
                    <span className="font-semibold text-brand-navy">
                      Patient:
                    </span>{" "}
                    {displayName}
                  </span>
                )}
                {displayDate && (
                  <span>
                    <span className="font-semibold text-brand-navy">Date:</span>{" "}
                    {new Date(displayDate + "T00:00:00").toLocaleDateString()}
                  </span>
                )}
                <span>
                  <span className="font-semibold text-brand-navy">
                    Follow-up visit:
                  </span>{" "}
                  {isFollowUp ? "Yes" : "No"}
                </span>
              </div>
            </div>
            <Image
              src="/brand/oviz-by-otovantage-logo.png"
              alt="Clarity-Hearing-system"
              width={954}
              height={340}
              priority
              className="h-14 w-auto"
            />
          </div>
          <RisingLine className="mt-5 h-3 w-full opacity-60 print:hidden" />
        </header>

        <section className="mb-8 grid grid-cols-3 gap-4 print:break-inside-avoid">
          <Stat label="PTA" value={`${inputs.pta} dB HL`} />
          <Stat label="WRS" value={`${inputs.wrs}%`} />
          <Stat label="Loss duration" value={`${inputs.durationYears} yr`} />
        </section>

        <div className="mb-8">
          <AtAGlance outputs={outputs} />
        </div>

        <div className="flex flex-col gap-7">
          <SectionCard
            icon={BatteryCharging}
            kicker="How hard your brain is working"
            title="Brain Battery"
            takeaway={
              <>
                Think of listening like a battery. Right now the brain spends
                about{" "}
                <b className="font-semibold">{effortPct}% of its energy</b>{" "}
                just to follow sound — leaving less for remembering, focusing
                and enjoying the moment.
              </>
            }
            whatWeCanDo="reducing listening effort is one of the clearest day-to-day benefits people notice with the right support."
          >
            <Reveal>
              <BrainBatteryViz battery={outputs.brainBattery} />
            </Reveal>
          </SectionCard>

          <SectionCard
            icon={MessagesSquare}
            kicker="How many words you catch"
            title="Word Understanding Scenario"
            takeaway={
              <>
                You catch about{" "}
                <b className="font-semibold">
                  {wrsPct}% of clearly spoken words
                </b>{" "}
                today. {outputs.wordUnderstanding.label}; without support that
                tends to slip a little each year.
              </>
            }
            whatWeCanDo={`support won't turn back the clock, but it slows the slide — modelled at about ${wrsTreated}% with help versus ${wrsUntreated}% without, in five years.`}
          >
            <Reveal>
              <WordUnderstandingViz wu={outputs.wordUnderstanding} />
            </Reveal>
          </SectionCard>

          <SectionCard
            icon={Users}
            kicker="How far comfortable hearing reaches"
            title="Social Radius"
            takeaway={
              <>
                Comfortable conversation reaches about{" "}
                <b className="font-semibold">
                  {outputs.socialRadius.currentRadius.toFixed(1)} of 10
                </b>{" "}
                today. With support, that circle can grow to take in more of
                the room.
              </>
            }
            whatWeCanDo="a wider comfortable radius means staying part of group conversations instead of stepping back from them."
          >
            <Reveal>
              <SocialRadiusViz radius={outputs.socialRadius} />
            </Reveal>
          </SectionCard>

          <SectionCard
            icon={Clock}
            kicker="This affects both of you"
            title="Partner Impact Mirror"
            takeaway={
              <>
                A partner repeats themselves about{" "}
                <b className="font-semibold">{repeats} times a day</b>. Over a
                year, that adds up to{" "}
                <b className="font-semibold">
                  {outputs.partnerImpact.annualPartnerHours.toFixed(1)} hours
                </b>{" "}
                of shared time spent on what hearing made hard to catch.
              </>
            }
            whatWeCanDo="fewer repeats is one of the first changes partners notice — it gives that time back to both of you."
          >
            <Reveal>
              <PartnerImpactViz impact={outputs.partnerImpact} />
            </Reveal>
          </SectionCard>

          <SectionCard
            icon={MapPinned}
            kicker="What matters most to you"
            title="Real-Life Listening Map"
            takeaway={
              <>
                These are the moments{" "}
                <b className="font-semibold">you told us matter</b>.{" "}
                {bestResponder && bestRelief !== undefined
                  ? `Amplification is modeled to ease the most difficulty in ${bestResponder} — up to ${bestRelief.toFixed(1)} points — though some difficulty remains in every situation.`
                  : "Each track shows where amplification could help and what would still remain."}
              </>
            }
            whatWeCanDo="your goals lead the plan — progress is measured against the situations you chose, not a generic checklist."
          >
            <Reveal>
              <ListeningLiftMap
                topGoals={outputs.listeningMap.topGoals}
                wrs={outputs.wordUnderstanding.current}
              />
            </Reveal>
          </SectionCard>
        </div>

        {showPhotosSection ? (
          <PlainSection title="Ear Fit Photos">
            {photos.length === 0 ? (
              <p className="text-brand-muted">
                No ear fit photos were included.
              </p>
            ) : (
              <PhotosGrid photos={photos} />
            )}
          </PlainSection>
        ) : null}

        <PlainSection title="Assumptions">
          <Assumptions modelVersion={modelVersion} />
        </PlainSection>

        <PlainSection title="Disclaimer">
          <p
            className="text-base leading-relaxed text-brand-muted"
            data-testid="report-disclaimer"
          >
            Educational projection based on published evidence and today&apos;s
            hearing results. Not a diagnosis, guarantee, or substitute for
            clinician judgment.
          </p>
        </PlainSection>

        <footer
          className="mt-12 border-t border-brand-line pt-6 text-center text-sm text-brand-muted"
          data-testid="report-footer"
        >
          {reportFooter ? (
            <p className="mb-1 whitespace-pre-line">{reportFooter}</p>
          ) : null}
          <p>Generated with Clarity-Hearing-system.</p>
        </footer>
      </div>
    </main>
  );
}

/** Footer/photos/assumptions don't need the patient-friendly chrome. */
function PlainSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 print:break-inside-avoid">
      <h2 className="mb-3 font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-line bg-brand-mist/50 p-4">
      <p className="text-xs uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold text-brand-navy">
        {value}
      </p>
    </div>
  );
}

function PhotosGrid({ photos }: { photos: PhotoUrl[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {photos.map((photo, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.url}
          src={photo.url}
          alt={`Ear fit photo ${idx + 1}`}
          className="aspect-square w-full rounded-xl border border-brand-line object-cover"
        />
      ))}
    </div>
  );
}

function Assumptions({ modelVersion }: { modelVersion: string }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-brand-muted">
      <li>
        Brain Battery: cognitive listening effort grows with PTA and word
        recognition deficit, amplified by self-reported symptoms. Capped at 100.
      </li>
      <li>
        Untreated drain: projected additional listening cost over five years,
        scaled by how long the loss has been unaddressed. Treatment is modeled as
        reducing — not eliminating — drain.
      </li>
      <li>
        Word Understanding: annual drift starts at one percentage point and
        accelerates above approximately 40 dB PTA. Treatment slows drift but does
        not project a future score above today&apos;s.
      </li>
      <li>
        Social Radius: derived from PTA, noise avoidance, and conversational
        difficulty. Treatment recovers half of the lost reach.
      </li>
      <li>
        Partner Impact: uses 10 seconds per repeat as a visible assumption.
        Annual hours = repeats per day × 10 × 365 ÷ 3600. Partner-reported
        frustration, avoidance, and social impact drive the qualitative summary
        only — they are not quantitative inputs to other outputs.
      </li>
      <li>
        Listening Goals: priority = 0.6 × difficulty + 0.4 × importance on a 0–10
        scale. Patient picks up to three situations; amplification benefit is
        modelled per situation, scaled by WRS, and capped so residual difficulty
        always remains.
      </li>
      <li>Model version: {modelVersion}.</li>
    </ul>
  );
}

function Blocked() {
  return (
    <main className="min-h-screen bg-brand-white text-brand-navy">
      <div className="mx-auto max-w-xl px-8 py-20">
        <h1 className="mb-3 font-heading text-2xl font-bold text-brand-navy">
          Clarity-Hearing-system Hearing Impact Summary
        </h1>
        <p className="text-brand-muted">Report cannot be generated yet.</p>
        <p className="mt-2 text-base text-brand-muted">
          A consult must be saved before its report can be prepared.
        </p>
      </div>
    </main>
  );
}
