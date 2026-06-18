import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { CompleteConsultForm } from "@/components/consult/complete-consult-form";
import { IntakeLinkPanel } from "@/components/consult/intake-link-panel";
import { ResultsDashboard } from "@/components/consult/results-dashboard";
import { PresentationMode } from "@/components/report/presentation-mode";
import { EarFitPhotos, type ExistingPhoto } from "@/components/EarFitPhotos";
import { Button } from "@/components/ui/button";
import type { ImpactOutputs } from "@/lib/calculators/impact";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConsultPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ConsultLoading />}>
      <ConsultBody params={params} />
    </Suspense>
  );
}

function ConsultLoading() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold text-brand-navy">
        Loading consult…
      </h1>
      <p className="mt-2 text-lg text-brand-muted">
        Fetching the saved projection.
      </p>
    </div>
  );
}

async function ConsultBody({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the consult first: with email/kiosk intake a consult can exist
  // before any model run does (awaiting_patient / patient_complete).
  const { data: consult, error: consultError } = await supabase
    .from("consults")
    .select(
      "clinic_id, status, intake_mode, patient_responses_submitted_at, photo_consent, patient_name, consult_date, is_follow_up",
    )
    .eq("id", id)
    .maybeSingle();

  if (consultError || !consult) {
    notFound();
  }

  const { data: modelRun } = await supabase
    .from("model_runs")
    .select("outputs, model_version, created_at")
    .eq("consult_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!modelRun) {
    return (
      <PendingConsult
        consultId={id}
        status={consult.status as string}
        intakeMode={(consult.intake_mode as string) ?? "in_clinic"}
        patientName={consult.patient_name as string | null}
        consultDate={consult.consult_date as string | null}
        submittedAt={consult.patient_responses_submitted_at as string | null}
      />
    );
  }

  const outputs = modelRun.outputs as ImpactOutputs;

  // Photo module gating: derive clinic from the consult, never trust client.
  let photoModuleEnabled = false;
  let initialConsent = false;
  let initialPhotos: ExistingPhoto[] = [];

  {
    initialConsent = consult.photo_consent === true;

    const { data: clinic } = await supabase
      .from("clinics")
      .select("photo_module_enabled")
      .eq("id", consult.clinic_id)
      .maybeSingle();
    photoModuleEnabled = clinic?.photo_module_enabled === true;

    if (photoModuleEnabled) {
      const { data: photoRows } = await supabase
        .from("ear_fit_photos")
        .select("id, upload_status, storage_path")
        .eq("consult_id", id)
        .order("created_at", { ascending: true });

      if (photoRows && photoRows.length > 0) {
        initialPhotos = await Promise.all(
          photoRows.map(async (row) => {
            if (row.upload_status !== "uploaded") {
              return {
                id: row.id,
                upload_status: row.upload_status,
                signedUrl: null,
              };
            }
            const { data: signed } = await supabase.storage
              .from("ear-fit-photos")
              .createSignedUrl(row.storage_path, 3600);
            return {
              id: row.id,
              upload_status: row.upload_status,
              signedUrl: signed?.signedUrl ?? null,
            };
          }),
        );
      }
    }
  }

  const patientName = (consult as { patient_name?: string | null } | null)
    ?.patient_name;
  const consultDate = (consult as { consult_date?: string | null } | null)
    ?.consult_date;
  const isFollowUp = (consult as { is_follow_up?: boolean | null } | null)
    ?.is_follow_up;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <BackLink href="/dashboard" />
        <div className="flex items-center gap-3">
          <PresentationMode outputs={outputs} />
          <Button
            asChild
            className="h-12 bg-brand-teal px-5 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
            data-testid="open-oviz-report-button"
          >
            <Link href={`/consults/${id}/report`}>
              <Printer className="h-5 w-5" />
              Open OViz Report
            </Link>
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow="Saved consult"
        title="Consult results"
        subtitle="Educational projection based on the saved inputs for this consult."
      />

      {(patientName || consultDate) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-brand-line bg-brand-white px-5 py-4 text-base text-brand-muted">
          {patientName && (
            <span>
              <span className="font-semibold text-brand-navy">Patient:</span>{" "}
              {patientName}
            </span>
          )}
          {consultDate && (
            <span>
              <span className="font-semibold text-brand-navy">Date:</span>{" "}
              {new Date(consultDate + "T00:00:00").toLocaleDateString()}
            </span>
          )}
          <span>
            <span className="font-semibold text-brand-navy">Follow-up:</span>{" "}
            {isFollowUp ? "Yes" : "No"}
          </span>
        </div>
      )}

      <ResultsDashboard outputs={outputs} />
      <EarFitPhotos
        consultId={id}
        photoModuleEnabled={photoModuleEnabled}
        initialConsent={initialConsent}
        initialPhotos={initialPhotos}
      />
    </div>
  );
}

function PendingConsult({
  consultId,
  status,
  intakeMode,
  patientName,
  consultDate,
  submittedAt,
}: {
  consultId: string;
  status: string;
  intakeMode: string;
  patientName: string | null;
  consultDate: string | null;
  submittedAt: string | null;
}) {
  const awaiting = status === "awaiting_patient";
  const received = status === "patient_complete";
  const modeLabel = intakeMode === "kiosk" ? "Kiosk" : "Email";

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/dashboard" />
      <PageHeader
        eyebrow={`${modeLabel} intake`}
        title="Consult in progress"
        subtitle={
          awaiting
            ? "Waiting for the patient to answer their questions."
            : "Patient responses received. Add the clinician inputs to generate results."
        }
      />

      {(patientName || consultDate) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-brand-line bg-brand-white px-5 py-4 text-base text-brand-muted">
          {patientName && (
            <span>
              <span className="font-semibold text-brand-navy">Patient:</span>{" "}
              {patientName}
            </span>
          )}
          {consultDate && (
            <span>
              <span className="font-semibold text-brand-navy">Date:</span>{" "}
              {new Date(consultDate + "T00:00:00").toLocaleDateString()}
            </span>
          )}
          {submittedAt && (
            <span>
              <span className="font-semibold text-brand-navy">
                Responses received:
              </span>{" "}
              {new Date(submittedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {awaiting ? <IntakeLinkPanel consultId={consultId} /> : null}

      {received ? (
        <section className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-brand-navy">
            Clinician inputs
          </h2>
          <p className="mb-6 mt-1 text-base text-brand-muted">
            From today&apos;s audiology results. Results are generated as soon
            as these are saved.
          </p>
          <CompleteConsultForm consultId={consultId} />
        </section>
      ) : null}
    </div>
  );
}
