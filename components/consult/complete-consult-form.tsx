"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CompleteConsultForm({ consultId }: { consultId: string }) {
  const router = useRouter();
  const [pta, setPta] = useState<number | null>(null);
  const [wrs, setWrs] = useState<number | null>(null);
  const [durationYears, setDurationYears] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    pta !== null &&
    pta >= 0 &&
    pta <= 120 &&
    wrs !== null &&
    wrs >= 0 &&
    wrs <= 100 &&
    durationYears !== null &&
    durationYears >= 0 &&
    durationYears <= 80;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/consults/${consultId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pta, wrs, durationYears }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error ?? "We could not generate results. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <NumberField
        id="complete-pta"
        label="Pure-tone average (PTA)"
        unit="dB HL"
        helper="Better-ear average across 0.5, 1, 2, and 4 kHz."
        value={pta}
        onChange={setPta}
        min={0}
        max={120}
      />
      <NumberField
        id="complete-wrs"
        label="Word recognition score (WRS)"
        unit="%"
        helper="Percent of words correctly identified at a comfortable level."
        value={wrs}
        onChange={setWrs}
        min={0}
        max={100}
      />
      <NumberField
        id="complete-durationYears"
        label="Loss duration"
        unit="years"
        helper="How long the patient has noticed hearing difficulty."
        value={durationYears}
        onChange={setDurationYears}
        min={0}
        max={80}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-base text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || submitting}
          data-testid="complete-consult-button"
          className="h-12 bg-brand-teal px-8 text-base font-semibold text-brand-white hover:bg-brand-teal-700"
        >
          {submitting ? "Generating…" : "Generate results"}
        </Button>
      </div>
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
      <label htmlFor={id} className="text-lg font-semibold text-brand-navy">
        {label}
      </label>
      <p className="text-base text-brand-muted">{helper}</p>
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
          className={`h-16 w-36 text-3xl font-semibold ${
            outOfRange
              ? "border-destructive focus-visible:ring-destructive/40"
              : ""
          }`}
          aria-invalid={outOfRange}
        />
        <span className="text-base text-brand-muted">{unit}</span>
      </div>
      {outOfRange ? (
        <p className="text-base font-medium text-destructive">
          Enter a value between {min} and {max}.
        </p>
      ) : null}
    </div>
  );
}
