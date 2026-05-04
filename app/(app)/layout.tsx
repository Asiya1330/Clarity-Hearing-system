import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-white">
      <nav className="border-b border-brand-slate/15 bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              aria-label="OViz home"
              className="flex items-center"
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

  return (
    <div className="hidden items-center gap-6 md:flex">
      <Link
        href="/dashboard"
        className="text-sm text-brand-navy hover:text-brand-teal"
      >
        Dashboard
      </Link>
      <Link
        href="/consults/new"
        className="text-sm text-brand-navy hover:text-brand-teal"
      >
        New Consult
      </Link>
      {isAdminOrOwner && (
        <Link
          href="/admin"
          className="text-sm text-brand-navy hover:text-brand-teal"
        >
          Admin
        </Link>
      )}
    </div>
  );
}

function NavLinksSkeleton() {
  return <div className="hidden h-5 w-52 animate-pulse rounded bg-brand-slate/10 md:block" />;
}
