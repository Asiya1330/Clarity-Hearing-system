import { ArrowRight, Building2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";

const sections = [
  {
    href: "/admin/clinic",
    title: "Clinic settings",
    description: "Update clinic name and report footer.",
    icon: Building2,
  },
  {
    href: "/admin/locations",
    title: "Locations",
    description: "Manage clinic locations for consult tracking.",
    icon: MapPin,
  },
  {
    href: "/admin/users",
    title: "Users",
    description: "Manage team members, roles, and invitations.",
    icon: Users,
  },
] as const;

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/dashboard" />
      <PageHeader
        title="Clarity-Hearing-system Admin"
        subtitle="Manage clinic settings, locations, and users."
      />
      <div className="grid gap-5 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-2xl border border-brand-line bg-brand-white p-6 shadow-sm transition-colors hover:border-brand-teal hover:bg-brand-tint/40"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand-teal-700">
              <s.icon className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-5 font-heading text-xl font-semibold text-brand-navy">
              {s.title}
            </p>
            <p className="mt-1 text-base leading-relaxed text-brand-muted">
              {s.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-base font-medium text-brand-teal-700">
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
