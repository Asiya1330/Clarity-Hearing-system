"use client";

import { Minus, Plus } from "lucide-react";

interface Props {
  id: string;
  label: string;
  helper?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
}

export function LabeledSlider({
  id,
  label,
  helper,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  minLabel,
  maxLabel,
}: Props) {
  // Keep the numeric contract identical: every path the calculators read goes
  // through the same clamp into [min, max]; the native range already clamps, so
  // for in-range integers this is a no-op.
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const atMin = value <= min;
  const atMax = value >= max;

  // A spoken value that carries the scale's end-label context, so screen-reader
  // users hear "3 (Easy to Very hard)" rather than a bare number.
  const endContext =
    minLabel && maxLabel
      ? ` (${minLabel} to ${maxLabel})`
      : maxLabel
        ? ` (up to ${maxLabel})`
        : minLabel
          ? ` (from ${minLabel})`
          : "";

  const stepBtn =
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border " +
    "border-brand-line bg-brand-white text-brand-navy transition-colors " +
    "hover:border-brand-teal hover:text-brand-teal-700 " +
    "disabled:cursor-not-allowed disabled:opacity-40 " +
    "disabled:hover:border-brand-line disabled:hover:text-brand-navy";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-lg font-semibold text-brand-navy">
          {label}
        </label>
        <span
          className="text-3xl font-semibold tabular-nums text-brand-teal-700"
          aria-live="polite"
        >
          {value}
        </span>
      </div>
      {helper ? (
        <p className="text-base leading-relaxed text-brand-muted">{helper}</p>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={atMin}
          aria-label={`Decrease ${label}`}
          className={stepBtn}
        >
          <Minus className="h-6 w-6" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          aria-valuetext={`${value}${endContext}`}
          className="oviz-range w-full"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={atMax}
          aria-label={`Increase ${label}`}
          className={stepBtn}
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      {minLabel || maxLabel ? (
        <div className="flex justify-between text-sm text-brand-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
