import { STEPS, type StepId } from "./types";

export function StepProgress({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-brand-slate">
        <span>
          Step {idx + 1} of {STEPS.length}
        </span>
        <span className="font-medium text-brand-navy">{STEPS[idx].label}</span>
      </div>
      <div className="flex gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            aria-current={i === idx ? "step" : undefined}
            className={`h-2 flex-1 rounded-full ${
              i < idx
                ? "bg-brand-navy"
                : i === idx
                ? "bg-brand-teal"
                : "bg-brand-slate/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
