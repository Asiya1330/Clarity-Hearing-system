"use client";

import { cn } from "@/lib/utils";
import { LabeledSlider } from "./labeled-slider";
import {
  LISTENING_PRESETS,
  MAX_LISTENING_SITUATIONS,
  type StepProps,
} from "./types";

export function StepListeningMap({ state, update }: StepProps) {
  const selected = new Set(state.listeningSituations.map((s) => s.name));
  const atLimit = state.listeningSituations.length >= MAX_LISTENING_SITUATIONS;

  const toggle = (name: string) => {
    if (selected.has(name)) {
      update(
        "listeningSituations",
        state.listeningSituations.filter((s) => s.name !== name),
      );
      return;
    }
    if (atLimit) return;
    update("listeningSituations", [
      ...state.listeningSituations,
      { name, difficulty: 5, importance: 5 },
    ]);
  };

  const setSituation = (
    idx: number,
    key: "difficulty" | "importance",
    value: number,
  ) => {
    const next = state.listeningSituations.map((s, i) =>
      i === idx ? { ...s, [key]: value } : s,
    );
    update("listeningSituations", next);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-brand-navy">
          Real-life listening map
        </h2>
        <p className="mt-2 text-brand-slate">
          Pick up to 3 situations that matter most. We&apos;ll record
          difficulty and importance for each.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {LISTENING_PRESETS.map((name) => {
            const isSelected = selected.has(name);
            const isDisabled = !isSelected && atLimit;
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                data-testid={`situation-chip-${name.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "h-14 rounded-lg border-2 px-4 text-base font-medium transition-colors",
                  isSelected
                    ? "border-brand-teal bg-brand-teal text-brand-white"
                    : "border-brand-slate/30 bg-brand-white text-brand-navy hover:border-brand-teal",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-brand-slate" data-testid="situation-count">
          {state.listeningSituations.length} of {MAX_LISTENING_SITUATIONS}{" "}
          selected
        </p>
      </div>

      {state.listeningSituations.length === 0 ? (
        <p className="rounded-md border border-dashed border-brand-slate/30 bg-brand-white p-6 text-center text-brand-slate">
          Select at least one situation to record listening priorities, or
          continue without selecting.
        </p>
      ) : (
        state.listeningSituations.map((situation, idx) => (
          <div
            key={situation.name}
            className="rounded-lg border border-brand-slate/20 bg-brand-white p-6"
          >
            <h3 className="mb-5 text-lg font-semibold text-brand-navy">
              {situation.name}
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <LabeledSlider
                id={`diff-${idx}`}
                label="Difficulty"
                value={situation.difficulty}
                onChange={(v) => setSituation(idx, "difficulty", v)}
                minLabel="Easy"
                maxLabel="Very hard"
              />
              <LabeledSlider
                id={`imp-${idx}`}
                label="Importance"
                value={situation.importance}
                onChange={(v) => setSituation(idx, "importance", v)}
                minLabel="Low"
                maxLabel="Essential"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
