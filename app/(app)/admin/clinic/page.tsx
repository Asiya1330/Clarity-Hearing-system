import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const UpdateClinicSchema = z.object({
  name: z.string().min(1).max(200),
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
  return <p className="text-sm text-brand-slate">Loading…</p>;
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
    !["owner", "admin"].includes(profile.role as string)
  ) {
    redirect("/dashboard");
  }
  const clinicId = profile.clinic_id as string;

  const { data: clinicRow } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", clinicId)
    .maybeSingle();

  const clinic = clinicRow as { name?: string } | null;

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
      !["owner", "admin"].includes(profile.role as string)
    ) {
      redirect("/dashboard");
    }
    const clinicId = profile.clinic_id as string;

    const parsed = UpdateClinicSchema.safeParse({
      name: formData.get("name") ?? "",
      report_footer: formData.get("report_footer") ?? "",
    });
    if (!parsed.success) {
      redirect("/admin/clinic?error=invalid");
    }

    const { error: updateError } = await supabase
      .from("clinics")
      .update({ name: parsed.data.name })
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Clinic settings</h1>
        <p className="mt-1 text-sm text-brand-slate">
          Update your clinic name and the footer text printed on all OViz
          reports.
        </p>
      </header>

      {saved && (
        <div
          role="status"
          className="rounded-md border border-brand-teal/40 bg-brand-teal/5 p-3 text-sm text-brand-teal"
        >
          Settings saved.
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {pageError === "invalid"
            ? "Please check the form fields."
            : "Save failed. Please try again."}
        </div>
      )}

      <form
        action={updateClinic}
        className="flex flex-col gap-5 rounded-lg border border-brand-slate/20 bg-brand-white p-6"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="clinic-name"
            className="text-sm font-medium text-brand-navy"
          >
            Clinic name
          </label>
          <input
            id="clinic-name"
            name="name"
            type="text"
            required
            defaultValue={clinic?.name ?? ""}
            maxLength={200}
            className="rounded-md border border-brand-slate/30 px-3 py-2 text-sm text-brand-navy placeholder-brand-slate/60 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </div>

        <div>
          <Button
            type="submit"
            className="bg-brand-teal text-brand-white hover:bg-brand-teal/90"
          >
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
