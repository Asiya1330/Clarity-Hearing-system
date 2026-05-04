import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { BackLink } from "@/components/BackLink";
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
  return <p className="text-sm text-brand-slate">Loading…</p>;
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

    const { error: insertError } = await supabase
      .from("locations")
      .insert({
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

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/admin" />
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Locations</h1>
        <p className="mt-1 text-sm text-brand-slate">
          Manage clinic locations. Locations can be associated with consults for
          reporting.
        </p>
      </header>

      {created && (
        <div
          role="status"
          className="rounded-md border border-brand-teal/40 bg-brand-teal/5 p-3 text-sm text-brand-teal"
        >
          Location created.
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {pageError === "invalid"
            ? "Please check the form fields."
            : "Could not create location. Please try again."}
        </div>
      )}

      {locations.length > 0 ? (
        <div className="rounded-lg border border-brand-slate/20 bg-brand-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-slate/15">
                <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b border-brand-slate/10 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {loc.name}
                  </td>
                  <td className="px-4 py-3 text-brand-slate">
                    {loc.address ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-brand-slate">No locations added yet.</p>
      )}

      <section className="rounded-lg border border-brand-slate/20 bg-brand-white p-6">
        <h2 className="mb-4 text-base font-semibold text-brand-navy">
          Add location
        </h2>
        <form action={createLocation} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="location-name"
              className="text-sm font-medium text-brand-navy"
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
              className="rounded-md border border-brand-slate/30 px-3 py-2 text-sm text-brand-navy placeholder-brand-slate/40 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="location-address"
              className="text-sm font-medium text-brand-navy"
            >
              Address
            </label>
            <input
              id="location-address"
              name="address"
              type="text"
              placeholder="e.g. 123 Main St, Vancouver, BC"
              maxLength={500}
              className="rounded-md border border-brand-slate/30 px-3 py-2 text-sm text-brand-navy placeholder-brand-slate/40 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>

          <div>
            <Button
              type="submit"
              className="bg-brand-teal text-brand-white hover:bg-brand-teal/90"
            >
              Add location
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
