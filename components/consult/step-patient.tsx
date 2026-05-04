"use client";

import { Input } from "@/components/ui/input";
import type { StepProps, WizardState } from "./types";

export function StepPatient({ state, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Patient information
        </h2>
        <p className="mt-1 text-brand-slate">
          Basic details for this consult. Patient name is optional.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="patient-name"
            className="text-base font-semibold text-brand-navy"
          >
            Patient name
          </label>
          <p className="text-sm text-brand-slate">
            Optional. Use a reference name or initials.
          </p>
          <Input
            id="patient-name"
            data-testid="patient-name-input"
            type="text"
            maxLength={120}
            placeholder="e.g. Alex Patient"
            value={state.patientName}
            onChange={(e) => update("patientName", e.target.value)}
            className="max-w-sm border-brand-slate/30 focus-visible:ring-brand-teal"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="consult-date"
            className="text-base font-semibold text-brand-navy"
          >
            Date <span className="text-destructive">*</span>
          </label>
          <p className="text-sm text-brand-slate">Defaults to today.</p>
          <Input
            id="consult-date"
            data-testid="consult-date-input"
            type="date"
            value={state.consultDate}
            onChange={(e) => update("consultDate", e.target.value)}
            className="max-w-[200px] border-brand-slate/30 focus-visible:ring-brand-teal"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-brand-navy">
            Follow-up visit
          </p>
          <p className="text-sm text-brand-slate">
            Is this a follow-up from a previous consult?
          </p>
          <div
            role="group"
            aria-label="Follow-up visit"
            data-testid="follow-up-visit-toggle"
            className="flex rounded-md border border-brand-slate/30"
          >
            <button
              type="button"
              aria-pressed={!state.isFollowUp}
              onClick={() => update("isFollowUp", false)}
              className={`flex-1 rounded-l-md px-5 py-2.5 text-sm font-medium transition-colors ${
                !state.isFollowUp
                  ? "bg-brand-teal text-brand-white"
                  : "bg-brand-white text-brand-slate hover:bg-brand-slate/5"
              }`}
            >
              No
            </button>
            <button
              type="button"
              aria-pressed={state.isFollowUp}
              onClick={() => update("isFollowUp", true)}
              className={`flex-1 rounded-r-md border-l border-brand-slate/30 px-5 py-2.5 text-sm font-medium transition-colors ${
                state.isFollowUp
                  ? "bg-brand-teal text-brand-white"
                  : "bg-brand-white text-brand-slate hover:bg-brand-slate/5"
              }`}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function isPatientStepValid(state: WizardState): boolean {
  return (
    state.consultDate.trim() !== "" &&
    /^\d{4}-\d{2}-\d{2}$/.test(state.consultDate) &&
    !isNaN(Date.parse(state.consultDate))
  );
}
