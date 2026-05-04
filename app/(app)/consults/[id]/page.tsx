import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { ResultsDashboard } from "@/components/consult/results-dashboard";
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
      <h1 className="text-3xl font-bold text-brand-navy">Loading consult…</h1>
      <p className="mt-2 text-brand-slate">Fetching the saved projection.</p>
    </div>
  );
}

async function ConsultBody({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: modelRun, error: modelRunError } = await supabase
    .from("model_runs")
    .select("outputs, model_version, created_at")
    .eq("consult_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (modelRunError || !modelRun) {
    notFound();
  }

  const outputs = modelRun.outputs as ImpactOutputs;

  // Photo module gating: derive clinic from the consult, never trust client.
  let photoModuleEnabled = false;
  let initialConsent = false;
  let initialPhotos: ExistingPhoto[] = [];

  const { data: consult } = await supabase
    .from("consults")
    .select(
      "clinic_id, photo_consent, patient_name, consult_date, is_follow_up",
    )
    .eq("id", id)
    .maybeSingle();

  if (consult) {
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
        <Button
          asChild
          className="h-11 bg-brand-teal px-5 text-brand-white hover:bg-brand-teal/90"
          data-testid="open-oviz-report-button"
        >
          <Link href={`/consults/${id}/report`}>
            <Printer className="h-4 w-4" />
            Open OViz Report
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-3xl font-bold text-brand-navy">Consult results</h1>
        <p className="mt-2 text-brand-slate">
          Educational projection based on the saved inputs for this consult.
        </p>
        {(patientName || consultDate) && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-slate">
            {patientName && (
              <span>
                <span className="font-medium text-brand-navy">Patient:</span>{" "}
                {patientName}
              </span>
            )}
            {consultDate && (
              <span>
                <span className="font-medium text-brand-navy">Date:</span>{" "}
                {new Date(consultDate + "T00:00:00").toLocaleDateString()}
              </span>
            )}
            <span>
              <span className="font-medium text-brand-navy">Follow-up:</span>{" "}
              {isFollowUp ? "Yes" : "No"}
            </span>
          </div>
        )}
      </header>

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
