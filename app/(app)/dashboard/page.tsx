import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/BackLink";
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
        <h1 className="text-3xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-2 text-brand-slate">Loading…</p>
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

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Dashboard</h1>
          <p className="mt-2 text-brand-slate">
            Start an educational consult or revisit a previous one.
          </p>
        </div>
        {clinic && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-navy">
              {clinic.name}
            </span>
            <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs capitalize text-brand-navy">
              {clinic.subscription_plan}
            </span>
            {clinic.photo_module_enabled && (
              <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs text-brand-teal">
                Photos on
              </span>
            )}
          </div>
        )}
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
            data-testid="start-consult-button"
          >
            <Link href="/consults/new">
              Start OViz Consult
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl text-brand-navy">Recent consults</h2>
        {consults.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-slate/30 bg-brand-white p-10 text-center text-brand-slate">
            Saved consults will appear here.
          </div>
        ) : (
          <div className="rounded-lg border border-brand-slate/20 bg-brand-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-slate/15">
                  <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                    Patient ref.
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-brand-navy">
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
                      className="border-b border-brand-slate/10 last:border-0"
                    >
                      <td className="px-4 py-3 text-brand-navy">
                        {consult.patient_reference ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-brand-slate">
                        {new Date(consult.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs capitalize text-brand-teal">
                          {consult.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/consults/${consult.id}`}
                            className="text-xs text-brand-slate hover:text-brand-navy hover:underline"
                          >
                            View
                          </Link>
                          {hasModelRun && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 border-brand-teal/40 text-xs text-brand-teal hover:bg-brand-teal/5"
                            >
                              <Link href={`/consults/${consult.id}/report`}>
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
