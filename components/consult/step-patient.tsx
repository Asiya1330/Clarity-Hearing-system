"use client";

import { Input } from "@/components/ui/input";
import type { StepProps, WizardState } from "./types";

export function StepPatient({ state, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="font-heading text-2xl font-semibold text-brand-navy">
          Patient information
        </h2>
        <p className="mt-1 text-lg text-brand-muted">
          Basic details for this consult. Patient name is optional.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="patient-name"
            className="text-lg font-semibold text-brand-navy"
          >
            Patient name
          </label>
          <p className="text-base text-brand-muted">
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
            className="h-14 max-w-sm text-lg"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="consult-date"
            className="text-lg font-semibold text-brand-navy"
          >
            Date <span className="text-destructive">*</span>
          </label>
          <p className="text-base text-brand-muted">Defaults to today.</p>
          <Input
            id="consult-date"
            data-testid="consult-date-input"
            type="date"
            value={state.consultDate}
            onChange={(e) => update("consultDate", e.target.value)}
            className="h-14 max-w-[220px] text-lg"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-brand-navy">
            Follow-up visit
          </p>
          <p className="text-base text-brand-muted">
            Is this a follow-up from a previous consult?
          </p>
          <div
            role="group"
            aria-label="Follow-up visit"
            data-testid="follow-up-visit-toggle"
            className="flex max-w-xs overflow-hidden rounded-lg border border-brand-line"
          >
            <button
              type="button"
              aria-pressed={!state.isFollowUp}
              onClick={() => update("isFollowUp", false)}
              className={`flex-1 px-6 py-3 text-base font-semibold transition-colors ${
                !state.isFollowUp
                  ? "bg-brand-teal text-brand-white"
                  : "bg-brand-white text-brand-muted hover:bg-brand-mist"
              }`}
            >
              No
            </button>
            <button
              type="button"
              aria-pressed={state.isFollowUp}
              onClick={() => update("isFollowUp", true)}
              className={`flex-1 border-l border-brand-line px-6 py-3 text-base font-semibold transition-colors ${
                state.isFollowUp
                  ? "bg-brand-teal text-brand-white"
                  : "bg-brand-white text-brand-muted hover:bg-brand-mist"
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
