"use client";

import { ChevronLeft, Star } from "lucide-react";
import { useState } from "react";

import type { LiftGoal } from "@/lib/calculators/listening-lift";
import { cn } from "@/lib/utils";

/**
 * Real-Life Listening Map tracks — client view with a two-option toggle.
 *
 * The calculator runs server-side; this component receives the already-computed,
 * serializable lift goals and only switches what each row draws:
 *
 *   Hearing aids (default): [slate: difficulty that remains with aids]
 *     [teal: the zone amplification eases][navy tick: today's pain point]
 *   No hearing aids:        [slate: today's full difficulty] — no teal, no tick.
 *
 * The toggle defaults to the aided view, so SSR / no-JS / reduced-motion / print
 * all render the aided projection unchanged. The control itself is screen-only
 * (print:hidden), so the printed report stays byte-for-byte the aided view it has
 * always been. Bars keep oviz-anim-grow-w + oviz-print-color and the inline
 * width/left % styles with the per-row stagger.
 */
export function ListeningLiftTracks({
  goals,
  bestResponder,
  wrs,
}: {
  goals: LiftGoal[];
  bestResponder: string | null;
  wrs: number;
}) {
  const [aided, setAided] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <ModeToggle aided={aided} onChange={setAided} />

      <Legend aided={aided} />

      <ol className="flex flex-col">
        {goals.map((g, i) => (
          <SituationRow
            key={`${g.name ?? "goal"}-${i}`}
            goal={g}
            index={i}
            aided={aided}
          />
        ))}
      </ol>

      {aided ? (
        <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-brand-muted">
          Across the situations chosen, amplification is modeled to ease the most
          difficulty in{" "}
          <span className="font-semibold text-brand-navy">
            {bestResponder ?? "the quietest setting"}
          </span>
          , and least in noisy, multi-talker settings. Benefit is scaled by
          today&apos;s word clarity ({Math.round(wrs)}% WRS): hearing aids restore
          access to sound, not normal hearing, so some difficulty remains in
          every situation.
        </p>
      ) : (
        <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-brand-muted">
          This is how hard each situation is today, without hearing aids — the
          difficulty you described for the moments that matter most.
        </p>
      )}
    </div>
  );
}

function ModeToggle({
  aided,
  onChange,
}: {
  aided: boolean;
  onChange: (aided: boolean) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Toggle hearing aids view"
      className="flex w-full max-w-sm gap-1 rounded-lg border border-brand-line bg-brand-mist p-1 print:hidden"
    >
      <SegmentButton
        active={!aided}
        onClick={() => onChange(false)}
        dotClass="bg-brand-slate"
        label="No hearing aids"
      />
      <SegmentButton
        active={aided}
        onClick={() => onChange(true)}
        dotClass="bg-brand-teal"
        label="Hearing aids"
      />
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  dotClass,
  label,
}: {
  active: boolean;
  onClick: () => void;
  dotClass: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-4 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-brand-mist",
        active
          ? "bg-brand-white font-semibold text-brand-navy shadow-sm"
          : "font-medium text-brand-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          active ? dotClass : "bg-brand-line",
        )}
      />
      {label}
    </button>
  );
}

const PRIORITY_LABELS = ["Top priority", "2nd priority", "3rd priority"];

function priorityLabel(index: number): string {
  return PRIORITY_LABELS[index] ?? `${index + 1}th priority`;
}

function SituationRow({
  goal,
  index = 0,
  aided,
}: {
  goal: LiftGoal;
  index?: number;
  aided: boolean;
}) {
  const todayPct = (goal.difficulty / 10) * 100;
  const aidedPct = (goal.aidedDifficulty / 10) * 100;
  const reliefPct = Math.max(0, todayPct - aidedPct);
  const delay = `${index * 140}ms`;

  const name = goal.name ?? "Listening goal";
  const ariaLabel = aided
    ? `${name}: today's difficulty is ${goal.difficulty.toFixed(1)}/10. With hearing aids, modeled to ease ${goal.relief.toFixed(1)} points, leaving ${goal.aidedDifficulty.toFixed(1)}/10.`
    : `${name}: difficulty today is ${goal.difficulty.toFixed(1)}/10, without hearing aids.`;

  return (
    <li className="flex flex-col gap-2 border-b border-brand-line py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
            {priorityLabel(index)}
          </span>
          <span className="text-lg font-semibold text-brand-navy">{name}</span>
        </span>
        <ImportanceStars importance={goal.importance} />
      </div>

      <div className="flex justify-between text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">
        <span>Easier</span>
        <span>Harder</span>
      </div>

      <div
        className="relative h-9 w-full overflow-hidden rounded-md bg-brand-mist shadow-[inset_0_0_0_1px_var(--brand-line,#E1E8EA)]"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Centre midpoint tick — anchors the 5/10 scale visually. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px bg-brand-line"
        />

        {/* Slate: difficulty that remains once aided, or today's full
            difficulty in the no-aids view. */}
        <span
          aria-hidden="true"
          className="oviz-anim-grow-w oviz-print-color absolute inset-y-0 left-0 bg-brand-slate"
          style={{
            width: `${aided ? aidedPct : todayPct}%`,
            transitionDelay: delay,
          }}
        />

        {aided && (
          <>
            {/* Teal: the zone amplification is modelled to ease. */}
            <span
              aria-hidden="true"
              className="oviz-anim-grow-w oviz-print-color absolute inset-y-0 border-l-2 border-brand-white bg-brand-teal"
              style={{
                left: `${aidedPct}%`,
                width: `${reliefPct}%`,
                transitionDelay: delay,
              }}
            />

            {/* Navy tick: today's pain point. */}
            <span
              aria-hidden="true"
              className="absolute -inset-y-0.5 w-0.5 bg-brand-navy"
              style={{ left: `calc(${todayPct}% - 1px)` }}
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-base text-brand-muted">
        {aided ? (
          <>
            <span>
              With aids{" "}
              <span className="font-semibold text-brand-teal-700">
                {goal.aidedDifficulty.toFixed(1)}
              </span>{" "}
              / 10
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal-700 bg-brand-tint/40 px-3 py-0.5 text-base font-semibold text-brand-teal-700">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              eases {goal.relief.toFixed(1)} pts
            </span>
            <span>
              Today{" "}
              <span className="font-semibold text-brand-navy">
                {goal.difficulty.toFixed(1)}
              </span>{" "}
              / 10
            </span>
          </>
        ) : (
          <span>
            Today{" "}
            <span className="font-semibold text-brand-navy">
              {goal.difficulty.toFixed(1)}
            </span>{" "}
            / 10
          </span>
        )}
      </div>
    </li>
  );
}

function ImportanceStars({ importance }: { importance: number }) {
  const filled = Math.round(importance / 2);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`Importance ${importance} / 10`}
      aria-label={`Importance ${importance} of 10`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < filled
              ? "h-4 w-4 fill-brand-teal text-brand-teal"
              : "h-4 w-4 text-brand-line"
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function Legend({ aided }: { aided: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-base text-brand-muted">
      <span className="inline-flex items-center gap-2">
        <span className="oviz-print-color h-3 w-3 rounded-sm bg-brand-slate" />
        {aided ? "Likely to remain" : "Difficulty today"}
      </span>
      {aided && (
        <>
          <span className="inline-flex items-center gap-2">
            <span className="oviz-print-color h-3 w-3 rounded-sm bg-brand-teal" />
            Eased by amplification
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="oviz-print-color h-3 w-0.5 bg-brand-navy" />
            Today
          </span>
        </>
      )}
    </div>
  );
}
