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
        <h2 className="font-heading text-2xl font-semibold text-brand-navy">
          Partner impact mirror
        </h2>
        <p className="mt-2 text-lg leading-relaxed text-brand-muted">
          This hearing difficulty may be affecting both of you. Optional — skip
          if a partner isn&apos;t available.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="partnerRepeats"
          className="text-lg font-semibold text-brand-navy"
        >
          Repeats per day from a partner
        </label>
        <p className="text-base text-brand-muted">
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
            className={`h-16 w-36 text-3xl font-semibold ${
              outOfRange
                ? "border-destructive focus-visible:ring-destructive/40"
                : ""
            }`}
            aria-invalid={outOfRange}
          />
          <span className="text-base text-brand-muted">repeats / day</span>
        </div>
        {outOfRange ? (
          <p className="text-base font-medium text-destructive">
            Enter a value between 0 and 500.
          </p>
        ) : null}
        <p className="mt-1 text-base text-brand-muted">
          Annual repeat burden uses a visible 10-second-per-repeat assumption.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-brand-line bg-brand-mist/50 p-6">
        <label className="flex cursor-pointer items-start gap-3 text-lg text-brand-navy">
          <Checkbox
            id="partnerParticipated"
            checked={state.partnerParticipated}
            onCheckedChange={(v) => update("partnerParticipated", v === true)}
            className="mt-1 h-6 w-6 border-2 border-brand-teal data-[state=checked]:bg-brand-teal data-[state=checked]:text-brand-white"
          />
          <span className="flex flex-col gap-1">
            <span className="font-semibold">
              A partner participated in this consult
            </span>
            <span className="text-base font-normal text-brand-muted">
              Capture partner-reported strain to round out the picture.
            </span>
          </span>
        </label>

        {state.partnerParticipated ? (
          <div className="flex flex-col gap-8 border-t border-brand-line pt-6">
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
  return state.partnerRepeatsPerDay >= 0 && state.partnerRepeatsPerDay <= 500;
}
