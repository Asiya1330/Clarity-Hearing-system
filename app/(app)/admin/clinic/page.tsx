import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { hasClinicAdminAccess } from "@/lib/clinic-roles";
import { createClient } from "@/lib/supabase/server";

const UpdateClinicSchema = z.object({
  name: z.string().min(1).max(200),
  report_footer: z.string().max(500).optional(),
});

interface PageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default function AdminClinicPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminClinicBody searchParams={searchParams} />
    </Suspense>
  );
}

function AdminLoading() {
  return <p className="text-base text-brand-muted">Loading…</p>;
}

async function AdminClinicBody({ searchParams }: PageProps) {
  const { saved, error: pageError } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !profile.clinic_id ||
    !hasClinicAdminAccess(profile.role as string)
  ) {
    redirect("/dashboard");
  }
  const clinicId = profile.clinic_id as string;

  const { data: clinicRow } = await supabase
    .from("clinics")
    .select("name, report_footer")
    .eq("id", clinicId)
    .maybeSingle();

  const clinic = clinicRow as {
    name?: string;
    report_footer?: string | null;
  } | null;

  async function updateClinic(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) redirect("/auth/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      !profile.clinic_id ||
      !hasClinicAdminAccess(profile.role as string)
    ) {
      redirect("/dashboard");
    }
    const clinicId = profile.clinic_id as string;

    const footerRaw = formData.get("report_footer") as string | null;
    const parsed = UpdateClinicSchema.safeParse({
      name: formData.get("name") ?? "",
      report_footer: footerRaw?.trim() || undefined,
    });
    if (!parsed.success) {
      redirect("/admin/clinic?error=invalid");
    }

    const { error: updateError } = await supabase
      .from("clinics")
      .update({
        name: parsed.data.name,
        report_footer: parsed.data.report_footer ?? null,
      })
      .eq("id", clinicId);

    if (updateError) {
      console.error("admin.clinic.update failed", {
        clinicId,
        code: updateError.code,
      });
      redirect("/admin/clinic?error=save-failed");
    }

    revalidatePath("/admin/clinic");
    redirect("/admin/clinic?saved=1");
  }

  const fieldClass =
    "h-12 w-full rounded-lg border border-brand-line px-3.5 py-2 text-base text-brand-navy placeholder:text-brand-muted/50 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40";

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/admin" />
      <PageHeader
        eyebrow="Admin"
        title="Clinic settings"
        subtitle="Update clinic name and report footer. Both appear on all OViz reports."
      />

      {saved && (
        <div
          role="status"
          className="rounded-xl border border-brand-teal/40 bg-brand-tint px-4 py-3 text-base font-medium text-brand-teal-700"
        >
          Settings saved.
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive"
        >
          {pageError === "invalid"
            ? "Please check the form fields."
            : "Save failed. Please try again."}
        </div>
      )}

      <form
        action={updateClinic}
        className="flex flex-col gap-6 rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="clinic-name"
            className="text-base font-semibold text-brand-navy"
          >
            Clinic name <span className="text-destructive">*</span>
          </label>
          <input
            id="clinic-name"
            name="name"
            type="text"
            required
            defaultValue={clinic?.name ?? ""}
            maxLength={200}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="report-footer"
            className="text-base font-semibold text-brand-navy"
          >
            Report footer
          </label>
          <p className="text-base text-brand-muted">
            Appears at the bottom of every OViz report — clinic address, phone,
            or custom text. Max 500 characters.
          </p>
          <textarea
            id="report-footer"
            name="report_footer"
            rows={3}
            defaultValue={clinic?.report_footer ?? ""}
            maxLength={500}
            placeholder="e.g. 123 Main St, Vancouver, BC · (604) 555-0100"
            className="w-full rounded-lg border border-brand-line px-3.5 py-2.5 text-base text-brand-navy placeholder:text-brand-muted/50 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>

        <div>
          <Button
            type="submit"
            className="h-12 bg-brand-teal px-6 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
          >
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
