import Link from "next/link";

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
      <div className="rounded-lg bg-brand-navy px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-brand-white">OViz Admin</span>
            <nav className="flex gap-6">
              {adminNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-brand-white/75 transition-colors hover:text-brand-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-brand-white/60 transition-colors hover:text-brand-white"
          >
            ← Back to OViz
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
