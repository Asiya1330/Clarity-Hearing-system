import Image from "next/image";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { PrintButton } from "@/components/report/print-button";
import { RisingLine } from "@/components/app/rising-line";
import type { ImpactOutputs, TopGoal } from "@/lib/calculators/impact";
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
          OViz Hearing Impact Summary
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

  return (
    <main className="min-h-screen bg-brand-white text-brand-navy print:bg-white">
      <div className="mx-auto max-w-[820px] px-8 py-10 print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <BackLink href={`/consults/${id}`} />
          <PrintButton />
        </div>

        <header className="mb-10 border-b-2 border-brand-navy pb-6 print:break-after-avoid">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal-700">
                {clinicName}
              </p>
              <h1
                className="font-heading text-3xl font-bold text-brand-navy"
                data-testid="report-title"
              >
                OViz Hearing Impact Summary
              </h1>
              <p className="text-base text-brand-muted">
                Prepared by {clinicName} using OViz by OtoVantage.
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
              alt="OViz by OtoVantage"
              width={954}
              height={340}
              priority
              className="h-14 w-auto"
            />
          </div>
          <RisingLine className="mt-5 h-3 w-full opacity-60 print:hidden" />
        </header>

        <section className="mb-10 grid grid-cols-3 gap-4 print:break-inside-avoid">
          <Stat label="PTA" value={`${inputs.pta} dB HL`} />
          <Stat label="WRS" value={`${inputs.wrs}%`} />
          <Stat label="Loss duration" value={`${inputs.durationYears} yr`} />
        </section>

        <Section title="Brain Battery">
          <p className="text-brand-muted">
            How hard the brain is working to listen today, with projected change
            over five years.
          </p>
          <BrainBattery battery={outputs.brainBattery} />
        </Section>

        <Section title="Word Understanding Scenario">
          <p className="text-brand-muted">{outputs.wordUnderstanding.label}.</p>
          <WordUnderstanding wu={outputs.wordUnderstanding} />
        </Section>

        <Section title="Social Radius">
          <p className="text-brand-muted">
            How far hearing comfortably reaches in everyday social settings.
          </p>
          <SocialRadius radius={outputs.socialRadius} />
        </Section>

        <Section title="Partner Impact Mirror">
          <p className="text-brand-muted">
            This hearing difficulty may be affecting both of you.
          </p>
          <PartnerImpact impact={outputs.partnerImpact} />
        </Section>

        <Section title="Real-Life Listening Goals">
          <p className="text-brand-muted">
            Patient-reported listening priorities.
          </p>
          {outputs.listeningMap.topGoals.length === 0 ? (
            <p className="text-brand-muted">
              No listening goals were captured for this consult.
            </p>
          ) : (
            <ListeningGoals goals={outputs.listeningMap.topGoals} />
          )}
        </Section>

        {showPhotosSection ? (
          <Section title="Ear Fit Photos">
            {photos.length === 0 ? (
              <p className="text-brand-muted">
                No ear fit photos were included.
              </p>
            ) : (
              <PhotosGrid photos={photos} />
            )}
          </Section>
        ) : null}

        <Section title="Assumptions">
          <Assumptions modelVersion={modelVersion} />
        </Section>

        <Section title="Disclaimer">
          <p
            className="text-base leading-relaxed text-brand-muted"
            data-testid="report-disclaimer"
          >
            Educational projection based on published evidence and today&apos;s
            hearing results. Not a diagnosis, guarantee, or substitute for
            clinician judgment.
          </p>
        </Section>

        <footer
          className="mt-12 border-t border-brand-line pt-6 text-center text-sm text-brand-muted"
          data-testid="report-footer"
        >
          {reportFooter ? (
            <p className="mb-1 whitespace-pre-line">{reportFooter}</p>
          ) : null}
          <p>Generated with OViz by OtoVantage.</p>
        </footer>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 print:break-inside-avoid">
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

function Bar({ pct, ariaLabel }: { pct: number; ariaLabel: string }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="oviz-print-color h-3 w-full overflow-hidden rounded-full bg-brand-line"
    >
      <div
        className="oviz-print-color h-full rounded-full bg-brand-teal"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function BrainBattery({
  battery,
}: {
  battery: ImpactOutputs["brainBattery"];
}) {
  const today = battery.brainLoad;
  const untreated = Math.min(battery.brainLoad + battery.untreatedDrain, 100);
  const treated = Math.min(battery.brainLoad + battery.treatedDrain, 100);
  const rows: { label: string; value: number }[] = [
    { label: "Today", value: today },
    { label: "5 years untreated", value: untreated },
    { label: "5 years with treatment", value: treated },
  ];
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium text-brand-navy">
              {row.label}
            </span>
            <span className="text-base tabular-nums text-brand-muted">
              {Math.round(row.value)}%
            </span>
          </div>
          <Bar pct={row.value} ariaLabel={`Brain load ${row.label}`} />
        </div>
      ))}
    </div>
  );
}

function WordUnderstanding({
  wu,
}: {
  wu: ImpactOutputs["wordUnderstanding"];
}) {
  const rows: { label: string; value: number }[] = [
    { label: "Today", value: wu.current },
    { label: "5 years untreated", value: wu.untreated5Year },
    { label: "5 years with treatment", value: wu.treated5Year },
  ];
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium text-brand-navy">
              {row.label}
            </span>
            <span className="text-base tabular-nums text-brand-muted">
              {Math.round(row.value)}%
            </span>
          </div>
          <Bar pct={row.value} ariaLabel={`Word understanding ${row.label}`} />
        </div>
      ))}
    </div>
  );
}

function SocialRadius({
  radius,
}: {
  radius: ImpactOutputs["socialRadius"];
}) {
  const rows: { label: string; value: number }[] = [
    { label: "Today", value: radius.currentRadius },
    { label: "With treatment", value: radius.treatedRadius },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="text-base text-brand-muted">
        Current social strain:{" "}
        <span className="font-semibold text-brand-navy">
          {Math.round(radius.socialStrain)} / 100
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium text-brand-navy">
              {row.label}
            </span>
            <span className="text-base tabular-nums text-brand-muted">
              {row.value.toFixed(1)} / 10
            </span>
          </div>
          <Bar
            pct={(row.value / 10) * 100}
            ariaLabel={`Social radius ${row.label}`}
          />
        </div>
      ))}
    </div>
  );
}

function PartnerImpact({
  impact,
}: {
  impact: ImpactOutputs["partnerImpact"];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-brand-line bg-brand-mist/50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-muted">
            Repeats per day
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-brand-navy">
            {Math.round(impact.repeatsPerDay)}
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            Assuming {impact.secondsPerRepeat} seconds per repeat.
          </p>
        </div>
        <div className="rounded-xl border border-brand-line bg-brand-mist/50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-muted">
            Annual partner hours
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-brand-navy">
            {impact.annualPartnerHours.toFixed(1)}
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            Hours per year spent repeating.
          </p>
        </div>
      </div>
      <p className="text-base leading-relaxed text-brand-muted">
        {impact.partnerImpactSummary}
      </p>
    </div>
  );
}

function ListeningGoals({ goals }: { goals: TopGoal[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {goals.map((goal, idx) => (
        <li
          key={`${goal.name ?? "goal"}-${idx}`}
          className="rounded-xl border border-brand-line bg-brand-white p-4"
        >
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-semibold text-brand-navy">
              {idx + 1}. {goal.name ?? "Listening goal"}
            </span>
            <span className="text-base tabular-nums text-brand-muted">
              priority {goal.priorityScore.toFixed(1)} / 10
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-brand-muted">
            <span>Difficulty: {goal.difficulty} / 10</span>
            <span>Importance: {goal.importance} / 10</span>
          </div>
          <div className="mt-3">
            <Bar
              pct={goal.priorityScore * 10}
              ariaLabel={`Priority score for ${goal.name ?? "goal"}`}
            />
          </div>
        </li>
      ))}
    </ol>
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
        scale. Patient picks up to three situations; results show the
        patient-reported listening priorities.
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
          OViz Hearing Impact Summary
        </h1>
        <p className="text-brand-muted">Report cannot be generated yet.</p>
        <p className="mt-2 text-base text-brand-muted">
          A consult must be saved before its report can be prepared.
        </p>
      </div>
    </main>
  );
}
