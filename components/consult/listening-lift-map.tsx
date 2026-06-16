import { ArrowDownRight, Star } from "lucide-react";
import type { TopGoal } from "@/lib/calculators/impact";
import { calculateListeningLift } from "@/lib/calculators/listening-lift";

/**
 * Real-Life Listening Map — amplification impact.
 *
 * Drop-in replacement for the priority-only Listening Map card. Renders, for
 * each patient-chosen situation, a single difficulty track split into the
 * portion amplification is modeled to ease (teal) and the portion likely to
 * remain (muted line colour), plus a Today -> Aided readout. Situations are
 * shown in the order they arrive (already ranked by priority upstream);
 * importance is surfaced as filled stars so the eye lands on what matters most.
 *
 * Pass the same `topGoals` the dashboard already has, plus the clinician WRS.
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
      <p className="text-lg text-brand-muted">No listening goals were captured.</p>
    );
  }

  const lift = calculateListeningLift(topGoals, wrs);

  return (
    <div className="flex flex-col gap-2">
      <Legend />
      <ol className="flex flex-col">
        {lift.goals.map((g, i) => (
          <SituationRow key={`${g.name ?? "goal"}-${i}`} goal={g} />
        ))}
      </ol>
      <p className="mt-3 text-base leading-relaxed text-brand-muted">
        Across the situations chosen, amplification is modeled to ease the most
        difficulty in{" "}
        <span className="font-semibold text-brand-navy">
          {lift.bestResponder ?? "the quietest setting"}
        </span>
        , and least in noisy, multi-talker settings. Benefit is scaled by
        today&apos;s word clarity ({Math.round(wrs)}% WRS): hearing aids restore
        access to sound, not normal hearing, so some difficulty remains in every
        situation.
      </p>
    </div>
  );
}

function SituationRow({
  goal,
}: {
  goal: ReturnType<typeof calculateListeningLift>["goals"][number];
}) {
  const reliefPct = (goal.relief / 10) * 100;
  const remainPct = (goal.aidedDifficulty / 10) * 100;

  return (
    <li className="flex flex-col gap-2 border-b border-brand-line py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold text-brand-navy">
          {goal.name ?? "Listening goal"}
        </span>
        <ImportanceStars importance={goal.importance} />
      </div>

      <div
        className="flex h-7 w-full overflow-hidden rounded-md bg-brand-mist"
        role="img"
        aria-label={`Today difficulty ${goal.difficulty.toFixed(
          1,
        )} of 10; amplification eases ${goal.relief.toFixed(
          1,
        )} points, leaving ${goal.aidedDifficulty.toFixed(1)} of 10.`}
      >
        <div
          className="oviz-anim-grow-w oviz-print-color h-full bg-brand-teal"
          style={{ width: `${reliefPct}%` }}
        />
        <div
          className="oviz-anim-grow-w oviz-print-color h-full bg-brand-slate"
          style={{ width: `${remainPct}%` }}
        />
      </div>

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-brand-muted">
        <span>
          Today{" "}
          <span className="font-semibold text-brand-navy">
            {goal.difficulty.toFixed(1)}
          </span>{" "}
          / 10
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-brand-teal-700">
          <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
          eases {goal.relief.toFixed(1)} pts
        </span>
        <span>
          With aids{" "}
          <span className="font-semibold text-brand-teal-700">
            {goal.aidedDifficulty.toFixed(1)}
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
              ? "h-3.5 w-3.5 fill-brand-teal text-brand-teal"
              : "h-3.5 w-3.5 text-brand-line"
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
        <span className="h-3 w-3 rounded-sm bg-brand-teal" />
        Difficulty amplification could ease
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm bg-brand-slate" />
        Difficulty likely to remain
      </span>
    </div>
  );
}
