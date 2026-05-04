"use client";

import { Input } from "@/components/ui/input";
import type { StepProps, WizardState } from "./types";

export function StepClinicianInputs({ state, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Clinician inputs
        </h2>
        <p className="mt-1 text-brand-slate">From today&apos;s audiology results.</p>
      </header>

      <NumberField
        id="pta"
        label="Pure-tone average (PTA)"
        unit="dB HL"
        helper="Better-ear average across 0.5, 1, 2, and 4 kHz."
        value={state.pta}
        onChange={(v) => update("pta", v)}
        min={0}
        max={120}
      />
      <NumberField
        id="wrs"
        label="Word recognition score (WRS)"
        unit="%"
        helper="Percent of words correctly identified at a comfortable level."
        value={state.wrs}
        onChange={(v) => update("wrs", v)}
        min={0}
        max={100}
      />
      <NumberField
        id="durationYears"
        label="Loss duration"
        unit="years"
        helper="How long the patient has noticed hearing difficulty."
        value={state.durationYears}
        onChange={(v) => update("durationYears", v)}
        min={0}
        max={80}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  unit,
  helper,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  helper: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
}) {
  const display = value ?? "";
  const outOfRange = value !== null && (value < min || value > max);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-brand-navy">
        {label}
      </label>
      <p className="text-sm text-brand-slate">{helper}</p>
      <div className="flex items-center gap-3">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={display}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
          className={`h-14 w-32 text-2xl ${
            outOfRange
              ? "border-destructive focus-visible:ring-destructive"
              : ""
          }`}
          aria-invalid={outOfRange}
        />
        <span className="text-sm text-brand-slate">{unit}</span>
      </div>
      {outOfRange ? (
        <p className="text-sm text-destructive">
          Enter a value between {min} and {max}.
        </p>
      ) : null}
    </div>
  );
}

export function isClinicianStepValid(state: WizardState): boolean {
  return (
    state.pta !== null &&
    state.pta >= 0 &&
    state.pta <= 120 &&
    state.wrs !== null &&
    state.wrs >= 0 &&
    state.wrs <= 100 &&
    state.durationYears !== null &&
    state.durationYears >= 0 &&
    state.durationYears <= 80
  );
}
