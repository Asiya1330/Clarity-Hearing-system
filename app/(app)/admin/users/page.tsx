import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "staff"]),
});

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "staff"]),
});

type Member = {
  id: string;
  role: string;
  full_name: string | null;
};

const roleBadgeClass: Record<string, string> = {
  owner: "bg-brand-navy/10 text-brand-navy",
  admin: "bg-brand-teal/10 text-brand-teal",
  staff: "bg-brand-slate/10 text-brand-slate",
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
  return <p className="text-sm text-brand-slate">Loading…</p>;
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
    !["owner", "admin"].includes(profile.role as string)
  ) {
    redirect("/dashboard");
  }
  const clinicId = profile.clinic_id as string;
  const isOwner = (profile.role as string) === "owner";

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

    if (!profile || (profile.role as string) !== "owner") {
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
      !["owner", "admin"].includes(profile.role as string)
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

    const { error: insertError } = await supabase
      .from("clinic_invites")
      .insert({
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">Users</h1>
        <p className="mt-1 text-sm text-brand-slate">
          Manage who has access to OViz for this clinic.
        </p>
      </header>

      {(saved ?? invited) && (
        <div
          role="status"
          className="rounded-md border border-brand-teal/40 bg-brand-teal/5 p-3 text-sm text-brand-teal"
        >
          {invited ? "Invitation created." : "Role updated."}
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessages[pageError] ?? "Something went wrong. Please try again."}
        </div>
      )}

      <div className="rounded-lg border border-brand-slate/20 bg-brand-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-slate/15">
              <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                Name / Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-brand-navy">
                Role
              </th>
              {isOwner && (
                <th className="px-4 py-3 text-left font-semibold text-brand-navy">
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
                  className="px-4 py-6 text-center text-sm text-brand-slate"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-brand-slate/10 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">
                      {member.full_name ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        roleBadgeClass[member.role] ??
                        "bg-brand-slate/10 text-brand-slate"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3">
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
                            className="rounded border border-brand-slate/30 px-2 py-1 text-xs text-brand-navy focus:border-brand-teal focus:outline-none"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-7 border-brand-teal/40 text-xs text-brand-teal hover:bg-brand-teal/5"
                          >
                            Save
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-brand-slate">You</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-brand-slate/20 bg-brand-white p-6">
        <h2 className="mb-1 text-base font-semibold text-brand-navy">
          Invite a user
        </h2>
        <p className="mb-4 text-xs text-brand-slate">
          Creates an invite record. Email delivery will be enabled in a future
          update.
        </p>
        <form action={inviteUser} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="invite-email"
                className="text-sm font-medium text-brand-navy"
              >
                Email <span className="text-destructive">*</span>
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="clinician@example.com"
                className="rounded-md border border-brand-slate/30 px-3 py-2 text-sm text-brand-navy placeholder-brand-slate/40 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="invite-role"
                className="text-sm font-medium text-brand-navy"
              >
                Role <span className="text-destructive">*</span>
              </label>
              <select
                id="invite-role"
                name="role"
                defaultValue="staff"
                className="rounded-md border border-brand-slate/30 px-3 py-2 text-sm text-brand-navy focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div>
            <Button
              type="submit"
              className="bg-brand-teal text-brand-white hover:bg-brand-teal/90"
            >
              Send invitation
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
