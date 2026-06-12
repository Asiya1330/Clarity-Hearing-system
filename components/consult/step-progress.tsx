import { STEPS, type StepId } from "./types";

export function StepProgress({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base">
        <span className="font-medium text-brand-muted">
          Step {idx + 1} of {STEPS.length}
        </span>
        <span className="font-heading font-semibold text-brand-navy">
          {STEPS[idx].label}
        </span>
      </div>
      <div className="flex gap-2" role="list" aria-label="Progress">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            role="listitem"
            aria-current={i === idx ? "step" : undefined}
            className={`h-2.5 flex-1 rounded-full transition-colors ${
              i < idx
                ? "bg-brand-navy"
                : i === idx
                ? "bg-brand-teal"
                : "bg-brand-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
