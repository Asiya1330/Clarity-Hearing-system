import { Mail, TabletSmartphone, Stethoscope } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { StartIntakeForm } from "@/components/consult/start-intake-form";

export default function StartConsultPage() {
  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/dashboard" />
      <PageHeader
        eyebrow="New consult"
        title="How will the patient answer?"
        subtitle="Choose how to capture the patient's everyday-listening responses. Clinician inputs (PTA, WRS, loss duration) are entered by you in every mode."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <ModeCard
          icon={<Mail className="h-7 w-7" aria-hidden="true" />}
          title="Email Client"
          description="The patient receives a personal link and answers from home before the appointment."
        >
          <StartIntakeForm mode="email" />
        </ModeCard>

        <ModeCard
          icon={<TabletSmartphone className="h-7 w-7" aria-hidden="true" />}
          title="Kiosk"
          description="Hand the patient a clinic tablet. They answer in the waiting area before the appointment begins."
        >
          <StartIntakeForm mode="kiosk" />
        </ModeCard>

        <ModeCard
          icon={<Stethoscope className="h-7 w-7" aria-hidden="true" />}
          title="In Clinic"
          description="You enter everything together with the patient, in one sitting — the full consult wizard."
        >
          <Link
            href="/consults/new"
            data-testid="mode-in-clinic"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-teal px-6 text-base font-semibold text-brand-white transition-colors hover:bg-brand-teal-700"
          >
            Start in-clinic consult
          </Link>
        </ModeCard>
      </div>

      <p className="max-w-prose text-base leading-relaxed text-brand-muted">
        Email and kiosk responses are saved to the patient&apos;s consult automatically. When you&apos;re ready, open the consult from the dashboard, add the clinician inputs, and the results are generated.
      </p>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-brand-line bg-brand-white p-6 shadow-sm">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand-teal-700">
        {icon}
      </span>
      <h2 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h2>
      <p className="mb-5 mt-1 flex-1 text-base leading-relaxed text-brand-muted">
        {description}
      </p>
      {children}
    </section>
  );
}
