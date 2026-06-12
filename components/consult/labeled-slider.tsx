"use client";

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
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="oviz-range w-full"
      />
      {minLabel || maxLabel ? (
        <div className="flex justify-between text-sm text-brand-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
