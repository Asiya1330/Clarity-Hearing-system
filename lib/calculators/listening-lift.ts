/**
 * OViz Listening Lift — amplification impact on the Real-Life Listening Map.
 *
 * Step 5 of the consult collects up to three situations the patient says
 * matter most, each rated for Difficulty (0..10) and Importance (0..10).
 * Until now those ratings only produced a static priority ranking. Every
 * other OViz card contrasts "today" with "with treatment"; this module gives
 * the Listening Map the same Today -> Aided contrast, but situation by
 * situation, in the patient's own chosen scenarios.
 *
 * Design constraints (consistent with lib/calculators/impact.ts):
 *  - Transparent heuristic, not a validated prediction or a device-performance
 *    guarantee. It exists to support a patient-provider conversation.
 *  - Treatment is partial, never restorative. Residual difficulty always
 *    remains; aided difficulty can never reach 0. This mirrors the house rule
 *    used elsewhere ("recovers half the lost reach", "reduces not eliminates").
 *  - Benefit is governed by two clinically real limiters:
 *      1. Acoustics of the situation. Amplification helps most in quiet,
 *         direct-sound settings (TV, phone, 1:1) and least in noisy,
 *         reverberant, multi-talker settings (restaurant, meetings) where the
 *         signal-to-noise ratio caps what louder sound can do.
 *      2. Word recognition (WRS) as a clarity governor. Hearing aids restore
 *         audibility, not clarity. A poor WRS means the brain still receives a
 *         degraded signal, so modeled benefit scales down with WRS. This is
 *         what keeps the tool honest and prevents over-promising — the single
 *         biggest driver of hearing-aid dissatisfaction and returns.
 *  - Importance never inflates predicted benefit (that would be dishonest). It
 *    orders the situations and is surfaced as visual weight so the eye lands on
 *    what the patient said matters most.
 */

import type { TopGoal } from "./impact";

export const LISTENING_LIFT_VERSION = "v1.0.0";

/** House "recover half the gap" constant, shared with Social Radius logic. */
const BASE_BENEFIT = 0.5;

/** Default acoustic responsiveness for an unrecognised / custom situation. */
const DEFAULT_RESPONSIVENESS = 0.55;

/**
 * Acoustic favourability for amplification, keyed to the Step-5 presets.
 * Higher = quieter / more direct sound = more of the modeled benefit is
 * achievable. Lower = noisier / more reverberant / more distant talkers.
 * Values are deliberately bounded below 1 so benefitFactor stays under
 * BASE_BENEFIT and residual difficulty is guaranteed.
 */
const SITUATION_RESPONSIVENESS: Record<string, number> = {
  TV: 0.85,
  "Phone calls": 0.85,
  "Medical appointments": 0.72,
  Grandchildren: 0.65,
  "Car conversations": 0.55,
  "Church/community events": 0.5,
  "Family dinner": 0.45,
  Meetings: 0.45,
  Restaurant: 0.38,
};

export interface LiftGoal extends TopGoal {
  /** 0..10, difficulty modeled to remain once aided. Always > 0. */
  aidedDifficulty: number;
  /** 0..10, difficulty points amplification is modeled to ease (today - aided). */
  relief: number;
  /** 0..1, fraction of today's difficulty modeled as resolved. */
  benefitFactor: number;
  /** Acoustic responsiveness used for this situation (for transparency / report). */
  responsiveness: number;
}

export interface ListeningLift {
  version: string;
  /** 0..1, clarity governor derived from WRS. */
  clarityFactor: number;
  goals: LiftGoal[];
  /** Total difficulty points eased across the chosen situations. */
  totalRelief: number;
  /** Name of the situation with the largest modeled lift, if any. */
  bestResponder: string | null;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function responsivenessFor(name: string | undefined): number {
  if (!name) return DEFAULT_RESPONSIVENESS;
  return SITUATION_RESPONSIVENESS[name] ?? DEFAULT_RESPONSIVENESS;
}

/**
 * Clarity governor: WRS 100 -> 1.0 (full modeled benefit available),
 * WRS 0 -> 0.40 (audibility still helps somewhat, but clarity caps it hard).
 */
export function clarityFactorFromWrs(wrs: number): number {
  const w = clamp(wrs, 0, 100);
  return 0.4 + 0.6 * (w / 100);
}

/**
 * Enrich the Step-5 goals with a Today -> Aided projection.
 *
 * @param goals  topGoals from calculateImpact (already capped at 3, ranked).
 * @param wrs    word recognition score (0..100) from clinician inputs.
 */
export function calculateListeningLift(
  goals: TopGoal[],
  wrs: number,
): ListeningLift {
  const clarityFactor = clarityFactorFromWrs(wrs);

  const liftGoals: LiftGoal[] = goals.map((g) => {
    const difficulty = clamp(g.difficulty, 0, 10);
    const responsiveness = responsivenessFor(g.name);
    const benefitFactor = clamp(
      BASE_BENEFIT * responsiveness * clarityFactor,
      0,
      0.49, // hard guard: never resolve more than ~half the difficulty
    );
    const aidedDifficulty = clamp(difficulty * (1 - benefitFactor), 0, 10);
    const relief = clamp(difficulty - aidedDifficulty, 0, 10);
    return {
      ...g,
      difficulty,
      responsiveness,
      benefitFactor,
      aidedDifficulty,
      relief,
    };
  });

  const totalRelief = liftGoals.reduce((sum, g) => sum + g.relief, 0);
  const bestResponder =
    liftGoals.length === 0
      ? null
      : liftGoals.reduce((best, g) => (g.relief > best.relief ? g : best))
          .name ?? null;

  return {
    version: LISTENING_LIFT_VERSION,
    clarityFactor,
    goals: liftGoals,
    totalRelief,
    bestResponder,
  };
}
