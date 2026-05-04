"use client";

import { calculateImpact } from "@/lib/calculators/impact";
import { buildPayload } from "./payload";
import { ResultsDashboard } from "./results-dashboard";
import type { WizardState } from "./types";

export function StepReview({
  state,
  errorMessage,
}: {
  state: WizardState;
  errorMessage: string | null;
}) {
  const inputs = buildPayload(state);
  const outputs = calculateImpact(inputs);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Review and save
        </h2>
        <p className="mt-1 text-brand-slate">
          A live preview of today&apos;s projection. Save to record this
          consult.
        </p>
      </header>

      <ResultsDashboard outputs={outputs} />

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
