import { describe, expect, it } from "vitest";

import { calculateImpact, type ImpactInputs } from "./impact";

/**
 * Guard tests for the Social Radius model.
 *
 * These do NOT reimplement any formula — they call the real calculateImpact and
 * assert the invariants the redesigned SocialRadiusViz (the "reach fan") relies
 * on:
 *   - the "today" reach is the linear inverse of social strain,
 *   - support recovers half the remaining gap (strictly between today and 10,
 *     and never reaches 10),
 *   - both radii stay inside the 0–10 fan scale for any input.
 *
 * If anyone later edits the socialStrain / currentRadius / treatedRadius
 * formulas in impact.ts, these tests MUST fail — that is their purpose. Do not
 * "fix" a failure here by changing the calculator.
 */

// Minimal valid input; override per-case. Mid-range, unremarkable defaults.
function makeInputs(overrides: Partial<ImpactInputs> = {}): ImpactInputs {
  return {
    pta: 40,
    wrs: 80,
    durationYears: 5,
    fatigue: 5,
    avoidNoise: 5,
    repeats: 5,
    tvVolume: 5,
    conversation: 5,
    ...overrides,
  };
}

describe("Social Radius model invariants (guards the redesign)", () => {
  it("currentRadius is the linear inverse of socialStrain: (100 - socialStrain) / 10", () => {
    // Assert the relationship between the two real outputs, so no formula is
    // duplicated here.
    const { socialRadius } = calculateImpact(
      makeInputs({ pta: 50, avoidNoise: 6, conversation: 4 }),
    );
    expect(socialRadius.currentRadius).toBeCloseTo(
      (100 - socialRadius.socialStrain) / 10,
      10,
    );
  });

  it("treatedRadius recovers half the remaining gap: strictly between currentRadius and 10 when currentRadius < 10", () => {
    const cases: ImpactInputs[] = [
      makeInputs({ pta: 30, avoidNoise: 2, conversation: 2 }),
      makeInputs({ pta: 55, avoidNoise: 5, conversation: 6 }),
      makeInputs({ pta: 80, avoidNoise: 10, conversation: 10 }),
      makeInputs({ pta: 10, avoidNoise: 1, conversation: 0 }),
      makeInputs({ pta: 65, avoidNoise: 7, conversation: 3 }),
    ];

    for (const input of cases) {
      const { currentRadius, treatedRadius } =
        calculateImpact(input).socialRadius;
      if (currentRadius < 10) {
        expect(treatedRadius).toBeGreaterThan(currentRadius);
        expect(treatedRadius).toBeLessThan(10);
        // Specifically: half of the remaining gap to 10.
        expect(treatedRadius).toBeCloseTo(
          currentRadius + (10 - currentRadius) * 0.5,
          10,
        );
      }
    }
  });

  it("both radii stay within [0, 10] across edge and out-of-range inputs", () => {
    const edges: ImpactInputs[] = [
      // Every strain driver at its floor.
      makeInputs({
        pta: 0,
        wrs: 100,
        fatigue: 0,
        avoidNoise: 0,
        repeats: 0,
        tvVolume: 0,
        conversation: 0,
      }),
      // Every strain driver at its ceiling.
      makeInputs({
        pta: 120,
        wrs: 0,
        fatigue: 10,
        avoidNoise: 10,
        repeats: 10,
        tvVolume: 10,
        conversation: 10,
      }),
      // Out-of-range values rely on the calculator's defensive clamping.
      makeInputs({ pta: -50, avoidNoise: -5, conversation: -5 }),
      makeInputs({ pta: 999, avoidNoise: 999, conversation: 999 }),
      makeInputs({
        pta: Number.NaN,
        avoidNoise: Number.NaN,
        conversation: Number.NaN,
      }),
    ];

    for (const input of edges) {
      const { currentRadius, treatedRadius } =
        calculateImpact(input).socialRadius;
      expect(currentRadius).toBeGreaterThanOrEqual(0);
      expect(currentRadius).toBeLessThanOrEqual(10);
      expect(treatedRadius).toBeGreaterThanOrEqual(0);
      expect(treatedRadius).toBeLessThanOrEqual(10);
    }
  });

  it("zero strain pins both radii at the top of the scale (10), so the lift band collapses", () => {
    // No strain drivers → socialStrain 0 → currentRadius 10 → treatedRadius 10.
    // This is the one case where treatedRadius is not strictly below 10.
    const { socialRadius } = calculateImpact(
      makeInputs({ pta: 0, avoidNoise: 0, conversation: 0 }),
    );
    expect(socialRadius.socialStrain).toBe(0);
    expect(socialRadius.currentRadius).toBe(10);
    expect(socialRadius.treatedRadius).toBe(10);
  });
});
