import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/app/page-header";
import { ConsultWizard } from "@/components/consult/wizard";

export default function NewConsultPage() {
  return (
    <div className="flex flex-col gap-8">
      <BackLink href="/dashboard" />
      <PageHeader
        title="New consult"
        subtitle="Move through each step. Required values are marked."
      />
      <div className="rounded-2xl border border-brand-line bg-brand-white p-6 shadow-sm sm:p-8">
        <ConsultWizard />
      </div>
    </div>
  );
}
