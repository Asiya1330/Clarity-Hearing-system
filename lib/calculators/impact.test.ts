import { describe, expect, it } from "vitest";
import {
  calculateImpact,
  MODEL_VERSION,
  type ImpactInputs,
} from "./impact";

const baseline: ImpactInputs = {
  pta: 0,
  wrs: 100,
  durationYears: 0,
  fatigue: 0,
  avoidNoise: 0,
  repeats: 0,
  tvVolume: 0,
  conversation: 0,
};

const maxedOut: ImpactInputs = {
  pta: 120,
  wrs: 0,
  durationYears: 80,
  fatigue: 10,
  avoidNoise: 10,
  repeats: 10,
  tvVolume: 10,
  conversation: 10,
};

describe("calculateImpact — output shape", () => {
  it("returns model version v1.1.0", () => {
    expect(MODEL_VERSION).toBe("v1.1.0");
    expect(calculateImpact(baseline).modelVersion).toBe("v1.1.0");
  });

  it("returns every documented section with every documented key", () => {
    const out = calculateImpact(baseline);
    expect(out).toMatchObject({
      modelVersion: expect.any(String),
      brainBattery: {
        brainLoad: expect.any(Number),
        untreatedDrain: expect.any(Number),
        treatedDrain: expect.any(Number),
      },
      wordUnderstanding: {
        current: expect.any(Number),
        untreated5Year: expect.any(Number),
        treated5Year: expect.any(Number),
        label: expect.any(String),
      },
      socialRadius: {
        socialStrain: expect.any(Number),
        currentRadius: expect.any(Number),
        treatedRadius: expect.any(Number),
      },
      partnerImpact: {
        repeatsPerDay: expect.any(Number),
        secondsPerRepeat: expect.any(Number),
        annualPartnerHours: expect.any(Number),
        partnerImpactSummary: expect.any(String),
      },
      listeningMap: {
        topGoals: expect.any(Array),
      },
    });
  });

  it("emits secondsPerRepeat = 10 (visible assumption)", () => {
    expect(calculateImpact(baseline).partnerImpact.secondsPerRepeat).toBe(10);
  });
});

describe("calculateImpact — clamp behavior", () => {
  it("clamps pta below 0 to 0", () => {
    const low = calculateImpact({ ...baseline, pta: -50 });
    const at0 = calculateImpact({ ...baseline, pta: 0 });
    expect(low).toEqual(at0);
  });

  it("clamps pta above 120 so output matches pta=120", () => {
    const huge = calculateImpact({ ...baseline, pta: 9999 });
    const at120 = calculateImpact({ ...baseline, pta: 120 });
    expect(huge).toEqual(at120);
  });

  it("clamps wrs below 0 and above 100", () => {
    const low = calculateImpact({ ...baseline, wrs: -50 });
    expect(low.wordUnderstanding.current).toBe(0);
    const high = calculateImpact({ ...baseline, wrs: 500 });
    expect(high.wordUnderstanding.current).toBe(100);
  });

  it("clamps slider inputs to [0, 10] without producing NaN", () => {
    const out = calculateImpact({
      ...baseline,
      fatigue: -5,
      avoidNoise: 99,
      repeats: -1,
      tvVolume: 25,
      conversation: -100,
    });
    expect(Number.isFinite(out.brainBattery.brainLoad)).toBe(true);
    expect(out.brainBattery.brainLoad).toBeGreaterThanOrEqual(0);
    expect(out.brainBattery.brainLoad).toBeLessThanOrEqual(100);
  });

  it("clamps durationYears to [0, 80]", () => {
    const negative = calculateImpact({ ...baseline, durationYears: -10 });
    const zero = calculateImpact({ ...baseline, durationYears: 0 });
    expect(negative).toEqual(zero);

    const huge = calculateImpact({ ...baseline, durationYears: 10000 });
    const eighty = calculateImpact({ ...baseline, durationYears: 80 });
    expect(huge).toEqual(eighty);
  });

  it("clamps partnerRepeatsPerDay to [0, 500]", () => {
    const above = calculateImpact({ ...baseline, partnerRepeatsPerDay: 9999 });
    expect(above.partnerImpact.repeatsPerDay).toBe(500);

    const below = calculateImpact({ ...baseline, partnerRepeatsPerDay: -50 });
    expect(below.partnerImpact.repeatsPerDay).toBe(0);
  });

  it("clamps partner sliders to [0, 10] before producing the summary", () => {
    const out = calculateImpact({
      ...baseline,
      partnerFrustration: 99,
      partnerAvoidance: -5,
      partnerSocialImpact: 50,
    });
    expect(out.partnerImpact.partnerImpactSummary).toMatch(/high today/);
  });

  it("clamps listening situation difficulty and importance to [0, 10]", () => {
    const out = calculateImpact({
      ...baseline,
      listeningSituations: [
        { name: "Restaurant", difficulty: 99, importance: 99 },
        { name: "Quiet room", difficulty: -5, importance: -5 },
      ],
    });
    expect(out.listeningMap.topGoals[0]).toMatchObject({
      name: "Restaurant",
      difficulty: 10,
      importance: 10,
    });
    expect(out.listeningMap.topGoals[0].priorityScore).toBeCloseTo(10);
    expect(out.listeningMap.topGoals[1]).toMatchObject({
      name: "Quiet room",
      difficulty: 0,
      importance: 0,
      priorityScore: 0,
    });
  });

  it("converts NaN inputs to safe minima rather than propagating NaN", () => {
    const out = calculateImpact({
      pta: Number.NaN,
      wrs: Number.NaN,
      durationYears: Number.NaN,
      fatigue: Number.NaN,
      avoidNoise: Number.NaN,
      repeats: Number.NaN,
      tvVolume: Number.NaN,
      conversation: Number.NaN,
    });
    Object.values(out.brainBattery).forEach((v) =>
      expect(Number.isFinite(v)).toBe(true),
    );
    Object.values(out.socialRadius).forEach((v) =>
      expect(Number.isFinite(v)).toBe(true),
    );
    expect(Number.isFinite(out.partnerImpact.repeatsPerDay)).toBe(true);
    expect(Number.isFinite(out.partnerImpact.annualPartnerHours)).toBe(true);
  });
});

describe("calculateImpact — input boundaries", () => {
  it("baseline (no loss, perfect WRS, no symptoms) emits zero strain", () => {
    const out = calculateImpact(baseline);
    expect(out.brainBattery.brainLoad).toBe(0);
    expect(out.wordUnderstanding.current).toBe(100);
    expect(out.wordUnderstanding.label).toMatch(/Excellent/);
    expect(out.socialRadius.socialStrain).toBe(0);
    expect(out.socialRadius.currentRadius).toBe(10);
    expect(out.partnerImpact.repeatsPerDay).toBe(0);
    expect(out.partnerImpact.annualPartnerHours).toBe(0);
    expect(out.listeningMap.topGoals).toEqual([]);
  });

  it("max-impact inputs saturate brainLoad and collapse social radius", () => {
    const out = calculateImpact(maxedOut);
    expect(out.brainBattery.brainLoad).toBe(100);
    expect(out.brainBattery.untreatedDrain).toBe(0);
    expect(out.brainBattery.treatedDrain).toBe(0);
    expect(out.wordUnderstanding.current).toBe(0);
    expect(out.wordUnderstanding.label).toMatch(/Very limited/);
    expect(out.socialRadius.socialStrain).toBe(100);
    expect(out.socialRadius.currentRadius).toBe(0);
    expect(out.partnerImpact.repeatsPerDay).toBe(50);
  });

  it("treated trajectory is at least as good as untreated trajectory", () => {
    const inputs: ImpactInputs = {
      pta: 60,
      wrs: 70,
      durationYears: 10,
      fatigue: 6,
      avoidNoise: 7,
      repeats: 5,
      tvVolume: 6,
      conversation: 5,
    };
    const out = calculateImpact(inputs);
    expect(out.brainBattery.treatedDrain).toBeLessThanOrEqual(
      out.brainBattery.untreatedDrain,
    );
    expect(out.wordUnderstanding.treated5Year).toBeGreaterThanOrEqual(
      out.wordUnderstanding.untreated5Year,
    );
    expect(out.socialRadius.treatedRadius).toBeGreaterThanOrEqual(
      out.socialRadius.currentRadius,
    );
  });

  it("treated 5-year WRS never exceeds today's WRS (no restoration claim)", () => {
    const out = calculateImpact({ ...baseline, pta: 50, wrs: 80 });
    expect(out.wordUnderstanding.treated5Year).toBeLessThanOrEqual(80);
  });

  it("longer untreated duration increases untreated brain drain when headroom remains", () => {
    const short = calculateImpact({
      ...baseline,
      pta: 40,
      wrs: 90,
      durationYears: 0,
    });
    const long = calculateImpact({
      ...baseline,
      pta: 40,
      wrs: 90,
      durationYears: 40,
    });
    expect(long.brainBattery.untreatedDrain).toBeGreaterThan(
      short.brainBattery.untreatedDrain,
    );
  });

  it("partner-reported repeats override the slider-derived estimate", () => {
    const partnerReported = calculateImpact({
      ...baseline,
      repeats: 0,
      partnerRepeatsPerDay: 30,
    });
    expect(partnerReported.partnerImpact.repeatsPerDay).toBe(30);

    const sliderOnly = calculateImpact({ ...baseline, repeats: 6 });
    expect(sliderOnly.partnerImpact.repeatsPerDay).toBe(30); // 6 × 5
  });

  it("annual partner hours equals repeatsPerDay × 10s × 365 / 3600", () => {
    const out = calculateImpact({ ...baseline, partnerRepeatsPerDay: 60 });
    expect(out.partnerImpact.annualPartnerHours).toBeCloseTo(
      (60 * 10 * 365) / 3600,
      5,
    );
  });
});

describe("partnerImpactSummary", () => {
  it("returns 'not captured' copy when no partner slider is provided", () => {
    const out = calculateImpact(baseline);
    expect(out.partnerImpact.partnerImpactSummary).toMatch(/not captured/i);
  });

  it("returns the high-strain copy when any partner slider is >= 7", () => {
    const out = calculateImpact({ ...baseline, partnerFrustration: 8 });
    expect(out.partnerImpact.partnerImpactSummary).toMatch(/high today/);
    expect(out.partnerImpact.partnerImpactSummary).toMatch(
      /may be affecting both of you/,
    );
  });

  it("returns the moderate-strain copy when peak slider is in [4, 7)", () => {
    const out = calculateImpact({ ...baseline, partnerAvoidance: 5 });
    expect(out.partnerImpact.partnerImpactSummary).toMatch(/moderate today/);
    expect(out.partnerImpact.partnerImpactSummary).toMatch(
      /may be affecting both of you/,
    );
  });

  it("returns the low-strain copy when all partner sliders are < 4", () => {
    const out = calculateImpact({
      ...baseline,
      partnerFrustration: 1,
      partnerAvoidance: 2,
      partnerSocialImpact: 3,
    });
    expect(out.partnerImpact.partnerImpactSummary).toMatch(/appears low today/);
    expect(out.partnerImpact.partnerImpactSummary).not.toMatch(
      /may be affecting both of you/,
    );
  });
});

describe("listeningMap — priority and cap", () => {
  it("computes priority as 0.6 × difficulty + 0.4 × importance", () => {
    const out = calculateImpact({
      ...baseline,
      listeningSituations: [
        { name: "Difficulty-only", difficulty: 10, importance: 0 }, // 6.0
        { name: "Importance-only", difficulty: 0, importance: 10 }, // 4.0
        { name: "Balanced", difficulty: 5, importance: 5 }, // 5.0
      ],
    });
    expect(out.listeningMap.topGoals[0]).toMatchObject({
      name: "Difficulty-only",
    });
    expect(out.listeningMap.topGoals[0].priorityScore).toBeCloseTo(6.0);
    expect(out.listeningMap.topGoals[1]).toMatchObject({ name: "Balanced" });
    expect(out.listeningMap.topGoals[1].priorityScore).toBeCloseTo(5.0);
    expect(out.listeningMap.topGoals[2]).toMatchObject({
      name: "Importance-only",
    });
    expect(out.listeningMap.topGoals[2].priorityScore).toBeCloseTo(4.0);
  });

  it("caps top goals at 3", () => {
    const situations = Array.from({ length: 7 }, (_, i) => ({
      name: `G${i}`,
      difficulty: i + 2,
      importance: i + 1,
    }));
    const out = calculateImpact({
      ...baseline,
      listeningSituations: situations,
    });
    expect(out.listeningMap.topGoals).toHaveLength(3);
  });

  it("sorts in descending priority order", () => {
    const out = calculateImpact({
      ...baseline,
      listeningSituations: [
        { name: "A", difficulty: 2, importance: 2 }, // 2.0
        { name: "B", difficulty: 8, importance: 9 }, // 8.4
        { name: "C", difficulty: 5, importance: 5 }, // 5.0
        { name: "D", difficulty: 10, importance: 10 }, // 10.0
        { name: "E", difficulty: 4, importance: 6 }, // 4.8
        { name: "F", difficulty: 7, importance: 3 }, // 5.4
      ],
    });
    expect(out.listeningMap.topGoals.map((g) => g.name)).toEqual([
      "D",
      "B",
      "F",
    ]);
  });
});
