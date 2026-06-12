import Image from "next/image";
import Link from "next/link";
import { RisingLine } from "@/components/app/rising-line";

const adminNav = [
  { href: "/admin/clinic", label: "Clinic settings" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/users", label: "Users" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-2xl bg-brand-navy shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/oviz-by-otovantage-logo.png"
                alt="OViz by OtoVantage"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="font-heading text-lg font-semibold text-brand-white">
                OViz Admin
              </span>
            </div>
            <nav className="flex flex-wrap gap-1">
              {adminNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-10 items-center rounded-lg px-3 text-base font-medium text-brand-white/80 transition-colors hover:bg-brand-white/10 hover:text-brand-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-lg px-3 text-base text-brand-white/70 transition-colors hover:bg-brand-white/10 hover:text-brand-white"
          >
            ← Back to OViz
          </Link>
        </div>
        <RisingLine className="h-[3px] w-full opacity-60" stroke="#67C7C7" />
      </div>
      {children}
    </div>
  );
}
