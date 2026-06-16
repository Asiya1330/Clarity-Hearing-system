import type { LucideIcon } from "lucide-react";
import { RevealOnScroll } from "./reveal-on-scroll";

/**
 * Premium-report section chrome.
 *
 * The redesign layers a consistent header (icon square + uppercase kicker +
 * heading + plain-language takeaway) above each impact visual, and closes
 * each section with a "What we can do" callout so the patient walks away
 * with a next-step they can talk about with the clinician. Used by both the
 * in-app consult dashboard and the printable report so the two never drift.
 *
 * Each card is wrapped in <RevealOnScroll>, which is the single client
 * boundary the redesign needs. Inner visuals stay server-rendered unless
 * they have their own interactivity.
 */
export function SectionCard({
  icon: Icon,
  kicker,
  title,
  takeaway,
  whatWeCanDo,
  children,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  takeaway: React.ReactNode;
  whatWeCanDo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RevealOnScroll
      as="section"
      className="rounded-2xl border border-brand-line bg-brand-white p-7 shadow-sm print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-teal-700"
        >
          <Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal-700">
            {kicker}
          </p>
          <h2 className="font-heading text-2xl font-semibold leading-tight text-brand-navy">
            {title}
          </h2>
        </div>
      </header>

      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-brand-navy">
        {takeaway}
      </p>

      <div className="mt-6 flex flex-col gap-4">{children}</div>

      <p className="mt-6 rounded-r-xl border-l-4 border-brand-teal bg-brand-tint/60 px-4 py-3 text-base leading-relaxed text-ink">
        <span className="font-semibold text-brand-teal-700">
          What we can do:{" "}
        </span>
        {whatWeCanDo}
      </p>
    </RevealOnScroll>
  );
}
