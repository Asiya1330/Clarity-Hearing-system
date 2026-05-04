"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LabeledSlider } from "./labeled-slider";
import type { StepProps, WizardState } from "./types";

export function StepPartnerImpact({ state, update }: StepProps) {
  const display = state.partnerRepeatsPerDay ?? "";
  const outOfRange =
    state.partnerRepeatsPerDay !== null &&
    (state.partnerRepeatsPerDay < 0 || state.partnerRepeatsPerDay > 500);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Partner impact mirror
        </h2>
        <p className="mt-2 text-brand-slate">
          This hearing difficulty may be affecting both of you. Optional — skip
          if a partner isn&apos;t available.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="partnerRepeats"
          className="text-base font-semibold text-brand-navy"
        >
          Repeats per day from a partner
        </label>
        <p className="text-sm text-brand-slate">
          A rough count of how often a partner has to repeat themselves on a
          typical day.
        </p>
        <div className="flex items-center gap-3">
          <Input
            id="partnerRepeats"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            step={1}
            value={display}
            onChange={(e) => {
              const v = e.target.value;
              update("partnerRepeatsPerDay", v === "" ? null : Number(v));
            }}
            className={`h-14 w-32 text-2xl ${
              outOfRange
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }`}
            aria-invalid={outOfRange}
          />
          <span className="text-sm text-brand-slate">repeats / day</span>
        </div>
        {outOfRange ? (
          <p className="text-sm text-destructive">
            Enter a value between 0 and 500.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-brand-slate">
          Annual repeat burden uses a visible 10-second-per-repeat assumption.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-lg border border-brand-slate/20 bg-brand-white p-6">
        <label className="flex items-start gap-3 text-base text-brand-navy cursor-pointer">
          <Checkbox
            id="partnerParticipated"
            checked={state.partnerParticipated}
            onCheckedChange={(v) =>
              update("partnerParticipated", v === true)
            }
            className="mt-1 h-6 w-6 border-2 border-brand-teal data-[state=checked]:bg-brand-teal data-[state=checked]:text-brand-white"
          />
          <span className="flex flex-col gap-1">
            <span className="font-semibold">
              A partner participated in this consult
            </span>
            <span className="text-sm font-normal text-brand-slate">
              Capture partner-reported strain to round out the picture.
            </span>
          </span>
        </label>

        {state.partnerParticipated ? (
          <div className="flex flex-col gap-8 border-t border-brand-slate/20 pt-6">
            <LabeledSlider
              id="partnerFrustration"
              label="Partner frustration"
              helper="How frustrated does the partner feel about hearing-related miscommunication?"
              value={state.partnerFrustration}
              onChange={(v) => update("partnerFrustration", v)}
              minLabel="Not at all"
              maxLabel="Very frustrated"
            />
            <LabeledSlider
              id="partnerAvoidance"
              label="Partner avoidance"
              helper="How often does the partner avoid situations because hearing is hard?"
              value={state.partnerAvoidance}
              onChange={(v) => update("partnerAvoidance", v)}
              minLabel="Never"
              maxLabel="Often"
            />
            <LabeledSlider
              id="partnerSocialImpact"
              label="Partner social impact"
              helper="How much have social plans been shaped by hearing difficulty?"
              value={state.partnerSocialImpact}
              onChange={(v) => update("partnerSocialImpact", v)}
              minLabel="Not at all"
              maxLabel="A great deal"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function isPartnerStepValid(state: WizardState): boolean {
  if (state.partnerRepeatsPerDay === null) return true;
  return (
    state.partnerRepeatsPerDay >= 0 && state.partnerRepeatsPerDay <= 500
  );
}
