import Link from "next/link";
import { BackLink } from "@/components/BackLink";

const sections = [
  {
    href: "/admin/clinic",
    title: "Clinic settings",
    description: "Update clinic name and report footer.",
  },
  {
    href: "/admin/locations",
    title: "Locations",
    description: "Manage clinic locations for consult tracking.",
  },
  {
    href: "/admin/users",
    title: "Users",
    description: "Manage team members, roles, and invitations.",
  },
] as const;

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard" />
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">OViz Admin</h1>
        <p className="mt-1 text-sm text-brand-slate">
          Manage clinic settings, locations, and users.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-brand-slate/20 bg-brand-white p-5 transition-colors hover:border-brand-teal/40 hover:bg-brand-teal/5"
          >
            <p className="font-semibold text-brand-navy">{s.title}</p>
            <p className="mt-1 text-sm text-brand-slate">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
