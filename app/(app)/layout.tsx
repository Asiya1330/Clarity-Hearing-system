import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { RisingLine } from "@/components/app/rising-line";
import { createClient } from "@/lib/supabase/server";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="oviz-surface min-h-screen bg-brand-mist/40">
      <nav className="sticky top-0 z-30 border-b border-brand-line bg-brand-white/95 backdrop-blur supports-[backdrop-filter]:bg-brand-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              aria-label="OViz home"
              className="flex items-center rounded-lg"
            >
              <Image
                src="/brand/oviz-by-otovantage-logo.png"
                alt="OViz"
                width={954}
                height={340}
                priority
                className="h-10 w-auto"
              />
            </Link>
            <Suspense fallback={<NavLinksSkeleton />}>
              <NavLinks />
            </Suspense>
          </div>
          <LogoutButton />
        </div>
        <RisingLine className="h-[3px] w-full opacity-50" />
      </nav>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

async function NavLinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdminOrOwner = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdminOrOwner = ["owner", "admin"].includes(
      (profile?.role as string) ?? "",
    );
  }

  const linkClass =
    "inline-flex h-11 items-center rounded-lg px-3 text-base font-medium text-brand-navy transition-colors hover:bg-brand-mist hover:text-brand-teal-700";

  return (
    <div className="hidden items-center gap-1 md:flex">
      <Link href="/dashboard" className={linkClass}>
        Dashboard
      </Link>
      <Link href="/consults/start" className={linkClass}>
        New consult
      </Link>
      <Link href="/tools/audiogram" className={linkClass}>
        Demo tool
      </Link>
      {isAdminOrOwner && (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      )}
    </div>
  );
}

function NavLinksSkeleton() {
  return (
    <div className="hidden h-6 w-56 animate-pulse rounded bg-brand-line md:block" />
  );
}
