import Image from "next/image";
import { RisingLine } from "@/components/app/rising-line";

/**
 * Shared frame for every auth screen (login, sign-up, password reset).
 * Carries the redesign vocabulary — oviz-surface reading scale, the logo,
 * an eyebrow with the rising-line signature — so the front-of-house screens
 * match the authenticated app instead of the legacy starter look.
 */
export function AuthShell({
  eyebrow = "OViz by OtoVantage",
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="oviz-surface flex min-h-svh w-full flex-col bg-brand-mist/40">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/brand/oviz-by-otovantage-logo.png"
              alt="OViz by OtoVantage"
              width={954}
              height={340}
              priority
              className="h-12 w-auto"
            />
            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-teal-700">
                {eyebrow}
              </span>
              <RisingLine className="h-3 w-16 opacity-70" />
            </div>
          </div>
          {children}
        </div>
      </div>
      <footer className="px-6 pb-8 text-center text-sm text-brand-muted">
        Educational projection based on published evidence and today&apos;s
        hearing results. Not a diagnosis, guarantee, or substitute for clinician
        judgment.
      </footer>
    </div>
  );
}
