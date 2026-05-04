import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-white">
      <nav className="border-b border-brand-slate/15 bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
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
          <LogoutButton />
        </div>
      </nav>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
