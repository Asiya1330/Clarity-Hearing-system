import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNABLE_CLINIC_ROLES,
  CLINIC_ROLE_LABELS,
  formatClinicRole,
  hasClinicAdminAccess,
  INVITE_CLINIC_ROLES,
  isClinicOwner,
} from "@/lib/clinic-roles";

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ASSIGNABLE_CLINIC_ROLES),
});

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(INVITE_CLINIC_ROLES),
});

type Member = {
  id: string;
  role: string;
  full_name: string | null;
};

const roleBadgeClass: Record<string, string> = {
  owner: "bg-brand-navy/10 text-brand-navy",
  "clinic-admin": "bg-brand-tint text-brand-teal-700",
  "clinic-staff": "bg-brand-slate/15 text-brand-muted",
  employee: "bg-brand-slate/10 text-brand-muted",
};

const errorMessages: Record<string, string> = {
  unauthorized: "Only clinic owners can change roles.",
  "last-owner": "Cannot change the role of the last owner.",
  invalid: "Please check the form fields.",
  "save-failed": "Could not save changes. Please try again.",
  "invite-invalid": "Please enter a valid email address.",
  "invite-failed": "Could not create invitation. Please try again.",
};

interface PageProps {
  searchParams: Promise<{
    saved?: string;
    invited?: string;
    error?: string;
  }>;
}

export default function AdminUsersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUsersBody searchParams={searchParams} />
    </Suspense>
  );
}

function AdminLoading() {
  return <p className="text-base text-brand-muted">Loading…</p>;
}

async function AdminUsersBody({ searchParams }: PageProps) {
  const { saved, invited, error: pageError } = await searchParams;

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
  const isOwner = isClinicOwner(profile.role as string);

  const { data: memberRows } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("clinic_id", clinicId)
    .order("role", { ascending: true });

  const members = (memberRows ?? []) as Member[];

  async function changeRole(formData: FormData) {
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

    if (!profile || !isClinicOwner(profile.role as string)) {
      redirect("/admin/users?error=unauthorized");
    }
    const clinicId = profile.clinic_id as string;

    const parsed = ChangeRoleSchema.safeParse({
      user_id: formData.get("user_id"),
      role: formData.get("role"),
    });
    if (!parsed.success) {
      redirect("/admin/users?error=invalid");
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", parsed.data.user_id)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    const currentRole = (targetProfile as { role?: string } | null)?.role;

    if (currentRole === "owner" && parsed.data.role !== "owner") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("role", "owner");

      if ((count ?? 0) <= 1) {
        redirect("/admin/users?error=last-owner");
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.user_id)
      .eq("clinic_id", clinicId);

    if (updateError) {
      console.error("admin.users.changeRole failed", {
        clinicId,
        code: updateError.code,
      });
      redirect("/admin/users?error=save-failed");
    }

    revalidatePath("/admin/users");
    redirect("/admin/users?saved=1");
  }

  async function inviteUser(formData: FormData) {
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

    const parsed = InviteSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
    });
    if (!parsed.success) {
      redirect("/admin/users?error=invite-invalid");
    }

    const { error: insertError } = await supabase.from("clinic_invites").insert({
      clinic_id: clinicId,
      invited_by: user.id,
      email: parsed.data.email,
      role: parsed.data.role,
    });

    if (insertError) {
      console.error("admin.users.invite failed", {
        clinicId,
        code: insertError.code,
      });
      redirect("/admin/users?error=invite-failed");
    }

    revalidatePath("/admin/users");
    redirect("/admin/users?invited=1");
  }

  const fieldClass =
    "h-12 w-full rounded-lg border border-brand-line px-3.5 py-2 text-base text-brand-navy placeholder:text-brand-muted/50 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40";

  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/admin" />
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle="Manage who has access to OViz for this clinic."
      />

      {(saved ?? invited) && (
        <div
          role="status"
          className="rounded-xl border border-brand-teal/40 bg-brand-tint px-4 py-3 text-base font-medium text-brand-teal-700"
        >
          {invited ? "Invitation created." : "Role updated."}
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive"
        >
          {errorMessages[pageError] ?? "Something went wrong. Please try again."}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-white shadow-sm">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-brand-line bg-brand-mist text-left">
              <th className="px-5 py-4 font-semibold text-brand-navy">
                Name / Email
              </th>
              <th className="px-5 py-4 font-semibold text-brand-navy">Role</th>
              {isOwner && (
                <th className="px-5 py-4 font-semibold text-brand-navy">
                  Change role
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={isOwner ? 3 : 2}
                  className="px-5 py-8 text-center text-base text-brand-muted"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-brand-line last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-brand-navy">
                      {member.full_name ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
                        roleBadgeClass[member.role] ??
                        "bg-brand-slate/15 text-brand-muted"
                      }`}
                    >
                      {formatClinicRole(member.role)}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-5 py-4">
                      {member.id !== user.id ? (
                        <form
                          action={changeRole}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="user_id"
                            value={member.id}
                          />
                          <select
                            name="role"
                            defaultValue={member.role}
                            aria-label="Role"
                            className="h-10 rounded-lg border border-brand-line px-3 text-base text-brand-navy focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
                          >
                            {ASSIGNABLE_CLINIC_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {CLINIC_ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-10 border-brand-teal/40 text-sm font-medium text-brand-teal-700 hover:bg-brand-tint"
                          >
                            Save
                          </Button>
                        </form>
                      ) : (
                        <span className="text-base text-brand-muted">You</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-brand-navy">
          Invite a user
        </h2>
        <p className="mb-5 mt-1 text-base text-brand-muted">
          Creates an invite record. Email delivery will be enabled in a future
          update.
        </p>
        <form action={inviteUser} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="invite-email"
                className="text-base font-semibold text-brand-navy"
              >
                Email <span className="text-destructive">*</span>
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="clinician@example.com"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="invite-role"
                className="text-base font-semibold text-brand-navy"
              >
                Role <span className="text-destructive">*</span>
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="clinic-staff"
                className={fieldClass}
              >
                {INVITE_CLINIC_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {CLINIC_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button
              type="submit"
              className="h-12 bg-brand-teal px-6 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
            >
              Send invitation
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
