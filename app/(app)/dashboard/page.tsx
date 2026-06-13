import { ArrowRight, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardBody />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-heading text-3xl font-semibold text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-2 text-lg text-brand-muted">Loading…</p>
      </header>
    </div>
  );
}

type ConsultRow = {
  id: string;
  patient_reference: string | null;
  status: string;
  created_at: string;
  model_runs: { id: string }[] | null;
};

async function DashboardBody() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.clinic_id) redirect("/onboarding");

  const clinicId = profile.clinic_id as string;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, subscription_plan, photo_module_enabled")
    .eq("id", clinicId)
    .maybeSingle();

  const { data: consultRows } = await supabase
    .from("consults")
    .select("id, patient_reference, status, created_at, model_runs(id)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(10);

  const consults = (consultRows ?? []) as ConsultRow[];

  return (
    <div className="flex flex-col gap-10">
      <BackLink href="/" label="Home" />

      <PageHeader
        eyebrow="Your clinic"
        title="Dashboard"
        subtitle="Start an educational consult or revisit a previous one."
        actions={
          clinic ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-brand-navy">
                {clinic.name}
              </span>
              <span className="rounded-full bg-brand-navy/10 px-3 py-1 text-sm font-medium capitalize text-brand-navy">
                {clinic.subscription_plan}
              </span>
              {clinic.photo_module_enabled && (
                <span className="rounded-full bg-brand-tint px-3 py-1 text-sm font-medium text-brand-teal-700">
                  Photos on
                </span>
              )}
            </div>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-2xl border border-brand-line bg-brand-white shadow-sm">
        <div className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-teal-700 sm:flex">
              <Plus className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-brand-navy">
                New consult
              </h2>
              <p className="mt-1 max-w-prose text-lg leading-relaxed text-brand-muted">
                Capture clinician inputs, patient sliders, and listening goals to
                generate today&apos;s projection.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="h-14 shrink-0 bg-brand-teal px-8 text-lg font-semibold text-brand-white hover:bg-brand-teal-700"
            data-testid="start-consult-button"
          >
            <Link href="/consults/start">
              Start OViz Consult
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-2xl font-semibold text-brand-navy">
          Recent consults
        </h2>
        {consults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-line bg-brand-white p-12 text-center text-lg text-brand-muted">
            Saved consults will appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-white shadow-sm">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-brand-line bg-brand-mist text-left">
                  <th className="px-5 py-4 font-semibold text-brand-navy">
                    Patient ref.
                  </th>
                  <th className="px-5 py-4 font-semibold text-brand-navy">
                    Date
                  </th>
                  <th className="px-5 py-4 font-semibold text-brand-navy">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right font-semibold text-brand-navy">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {consults.map((consult) => {
                  const hasModelRun =
                    Array.isArray(consult.model_runs) &&
                    consult.model_runs.length > 0;
                  return (
                    <tr
                      key={consult.id}
                      className="border-b border-brand-line last:border-0 hover:bg-brand-mist/50"
                    >
                      <td className="px-5 py-4 font-medium text-brand-navy">
                        {consult.patient_reference ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-brand-muted">
                        {new Date(consult.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-brand-tint px-3 py-1 text-sm font-medium capitalize text-brand-teal-700">
                          {consult.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/consults/${consult.id}`}
                            className="text-base font-medium text-brand-muted hover:text-brand-navy hover:underline"
                          >
                            View
                          </Link>
                          {hasModelRun && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-9 border-brand-teal/40 text-sm font-medium text-brand-teal-700 hover:bg-brand-tint"
                            >
                              <Link href={`/consults/${consult.id}/report`}>
                                <FileText className="h-4 w-4" />
                                Open OViz Report
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
