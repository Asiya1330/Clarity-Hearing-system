import { ArrowLeft, Star } from "lucide-react";

import type { TopGoal } from "@/lib/calculators/impact";
import { calculateListeningLift } from "@/lib/calculators/listening-lift";

/**
 * Real-Life Listening Map — premium amplification-impact track.
 *
 * Each situation renders against the full 0..10 difficulty scale. The track
 * tells a three-part story left-to-right:
 *
 *   [slate: difficulty that remains with aids][teal: the zone amplification eases][empty: easier-than-today][tick: today's pain point]
 *
 * The visual encoding mirrors how clinicians describe it: "you're at the tick
 * today; with aids the teal zone goes away and the slate is what's left." A
 * white tick marks today's point so the patient can see exactly how far back
 * the dial moves. Stars communicate importance; tracks are static (calculator
 * runs server-side and the visual is server-rendered).
 */
export function ListeningLiftMap({
  topGoals,
  wrs,
}: {
  topGoals: TopGoal[];
  wrs: number;
}) {
  if (topGoals.length === 0) {
    return (
      <p className="text-lg text-brand-muted">
        No listening goals were captured.
      </p>
    );
  }

  const lift = calculateListeningLift(topGoals, wrs);

  return (
    <div className="flex flex-col gap-4">
      <Legend />

      <ol className="flex flex-col">
        {lift.goals.map((g, i) => (
          <SituationRow key={`${g.name ?? "goal"}-${i}`} goal={g} index={i} />
        ))}
      </ol>

      <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-brand-muted">
        Across the situations chosen, amplification is modeled to ease the most
        difficulty in{" "}
        <span className="font-semibold text-brand-navy">
          {lift.bestResponder ?? "the quietest setting"}
        </span>
        , and least in noisy, multi-talker settings. Benefit is scaled by
        today&apos;s word clarity ({Math.round(wrs)}% WRS): hearing aids restore
        access to sound, not normal hearing, so some difficulty remains in
        every situation.
      </p>
    </div>
  );
}

function SituationRow({
  goal,
  index = 0,
}: {
  goal: ReturnType<typeof calculateListeningLift>["goals"][number];
  index?: number;
}) {
  const todayPct = (goal.difficulty / 10) * 100;
  const aidedPct = (goal.aidedDifficulty / 10) * 100;
  const reliefPct = Math.max(0, todayPct - aidedPct);
  const delay = `${index * 140}ms`;

  return (
    <li className="flex flex-col gap-2 border-b border-brand-line py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold text-brand-navy">
          {goal.name ?? "Listening goal"}
        </span>
        <ImportanceStars importance={goal.importance} />
      </div>

      <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
        <span>Easier</span>
        <span>Harder</span>
      </div>

      <div
        className="relative h-9 w-full overflow-hidden rounded-md bg-brand-mist shadow-[inset_0_0_0_1px_var(--brand-line,#E1E8EA)]"
        role="img"
        aria-label={`${goal.name ?? "Listening goal"}: today's difficulty is ${goal.difficulty.toFixed(1)} of 10. Amplification is modeled to ease ${goal.relief.toFixed(1)} points, leaving ${goal.aidedDifficulty.toFixed(1)} of 10 with aids.`}
      >
        {/* Centre midpoint tick — anchors the 5/10 scale visually. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px bg-brand-line"
        />

        {/* Slate: the difficulty that remains once aided. */}
        <span
          aria-hidden="true"
          className="oviz-anim-grow-w oviz-print-color absolute inset-y-0 left-0 bg-brand-slate"
          style={{ width: `${aidedPct}%`, transitionDelay: delay }}
        />

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

        {/* White tick: today's pain point. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-brand-white"
          style={{ left: `calc(${todayPct}% - 1px)` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-brand-muted">
        <span>
          With aids{" "}
          <span className="font-semibold text-brand-teal-700">
            {goal.aidedDifficulty.toFixed(1)}
          </span>{" "}
          / 10
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-teal-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          eases {goal.relief.toFixed(1)} pts
        </span>
        <span>
          Today{" "}
          <span className="font-semibold text-brand-navy">
            {goal.difficulty.toFixed(1)}
          </span>{" "}
          / 10
        </span>
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

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-brand-muted">
      <span className="inline-flex items-center gap-2">
        <span className="oviz-print-color h-3 w-3 rounded-sm bg-brand-slate" />
        Likely to remain
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="oviz-print-color h-3 w-3 rounded-sm bg-brand-teal" />
        Eased by amplification
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="oviz-print-color h-3 w-0.5 bg-brand-navy" />
        Today
      </span>
    </div>
  );
}
