import { ConsultWizard } from "@/components/consult/wizard";

export default function NewConsultPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-brand-navy">New consult</h1>
        <p className="mt-2 text-brand-slate">
          Move through each step. Required values are marked.
        </p>
      </header>
      <ConsultWizard />
    </div>
  );
}
