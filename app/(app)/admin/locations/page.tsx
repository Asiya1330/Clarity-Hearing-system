import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const CreateLocationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
});

type ClinicLocation = {
  id: string;
  name: string;
  address: string | null;
};

interface PageProps {
  searchParams: Promise<{ created?: string; error?: string }>;
}

export default function AdminLocationsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminLocationsBody searchParams={searchParams} />
    </Suspense>
  );
}

function AdminLoading() {
  return <p className="text-base text-brand-muted">Loading…</p>;
}

async function AdminLocationsBody({ searchParams }: PageProps) {
  const { created, error: pageError } = await searchParams;

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

  const { data: locationRows } = await supabase
    .from("locations")
    .select("id, name, address")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  const locations = (locationRows ?? []) as ClinicLocation[];

  async function createLocation(formData: FormData) {
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

    const addressRaw = formData.get("address") as string | null;
    const parsed = CreateLocationSchema.safeParse({
      name: formData.get("name") ?? "",
      address: addressRaw?.trim() || undefined,
    });
    if (!parsed.success) {
      redirect("/admin/locations?error=invalid");
    }

    const { error: insertError } = await supabase.from("locations").insert({
      clinic_id: clinicId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      active: true,
    });

    if (insertError) {
      console.error("admin.locations.create failed", {
        clinicId,
        code: insertError.code,
      });
      redirect("/admin/locations?error=create-failed");
    }

    revalidatePath("/admin/locations");
    redirect("/admin/locations?created=1");
  }

  const fieldClass =
    "h-12 w-full rounded-lg border border-brand-line px-3.5 py-2 text-base text-brand-navy placeholder:text-brand-muted/50 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40";

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/admin" />
      <PageHeader
        eyebrow="Admin"
        title="Locations"
        subtitle="Manage clinic locations. Locations can be associated with consults for reporting."
      />

      {created && (
        <div
          role="status"
          className="rounded-xl border border-brand-teal/40 bg-brand-tint px-4 py-3 text-base font-medium text-brand-teal-700"
        >
          Location created.
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive"
        >
          {pageError === "invalid"
            ? "Please check the form fields."
            : "Could not create location. Please try again."}
        </div>
      )}

      {locations.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-white shadow-sm">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-brand-line bg-brand-mist text-left">
                <th className="px-5 py-4 font-semibold text-brand-navy">Name</th>
                <th className="px-5 py-4 font-semibold text-brand-navy">
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b border-brand-line last:border-0"
                >
                  <td className="px-5 py-4 font-medium text-brand-navy">
                    {loc.name}
                  </td>
                  <td className="px-5 py-4 text-brand-muted">
                    {loc.address ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-base text-brand-muted">No locations added yet.</p>
      )}

      <section className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
        <h2 className="mb-5 font-heading text-xl font-semibold text-brand-navy">
          Add location
        </h2>
        <form action={createLocation} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="location-name"
              className="text-base font-semibold text-brand-navy"
            >
              Location name <span className="text-destructive">*</span>
            </label>
            <input
              id="location-name"
              name="name"
              type="text"
              required
              placeholder="e.g. Downtown Clinic"
              maxLength={200}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="location-address"
              className="text-base font-semibold text-brand-navy"
            >
              Address
            </label>
            <input
              id="location-address"
              name="address"
              type="text"
              placeholder="e.g. 123 Main St, Vancouver, BC"
              maxLength={500}
              className={fieldClass}
            />
          </div>

          <div>
            <Button
              type="submit"
              className="h-12 bg-brand-teal px-6 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
            >
              Add location
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
