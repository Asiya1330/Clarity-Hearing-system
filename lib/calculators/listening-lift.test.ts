import { describe, expect, it } from "vitest";
import type { TopGoal } from "./impact";
import {
  calculateListeningLift,
  clarityFactorFromWrs,
} from "./listening-lift";

function goal(name: string, difficulty: number, importance = 5): TopGoal {
  return {
    name,
    difficulty,
    importance,
    priorityScore: difficulty * 0.6 + importance * 0.4,
  };
}

describe("listening lift — clarity governor", () => {
  it("maps WRS 100 to full availability and WRS 0 to the 0.4 floor", () => {
    expect(clarityFactorFromWrs(100)).toBeCloseTo(1.0);
    expect(clarityFactorFromWrs(0)).toBeCloseTo(0.4);
    expect(clarityFactorFromWrs(50)).toBeCloseTo(0.7);
  });
});

describe("listening lift — honesty guarantees", () => {
  it("never eliminates difficulty: aided difficulty stays above zero", () => {
    const lift = calculateListeningLift([goal("Restaurant", 10)], 100);
    expect(lift.goals[0].aidedDifficulty).toBeGreaterThan(0);
  });

  it("never resolves more than ~half the difficulty (no restoration claim)", () => {
    const lift = calculateListeningLift([goal("TV", 10)], 100);
    expect(lift.goals[0].benefitFactor).toBeLessThanOrEqual(0.49);
    expect(lift.goals[0].relief).toBeLessThanOrEqual(5);
  });

  it("scales benefit down with poorer word recognition", () => {
    const good = calculateListeningLift([goal("TV", 8)], 90);
    const poor = calculateListeningLift([goal("TV", 8)], 40);
    expect(poor.goals[0].relief).toBeLessThan(good.goals[0].relief);
    expect(poor.goals[0].aidedDifficulty).toBeGreaterThan(
      good.goals[0].aidedDifficulty,
    );
  });

  it("eases more in quiet settings than in noisy ones at equal difficulty", () => {
    const lift = calculateListeningLift(
      [goal("TV", 8), goal("Restaurant", 8)],
      85,
    );
    const tv = lift.goals.find((g) => g.name === "TV")!;
    const restaurant = lift.goals.find((g) => g.name === "Restaurant")!;
    expect(tv.relief).toBeGreaterThan(restaurant.relief);
  });

  it("uses a default responsiveness for custom situations", () => {
    const lift = calculateListeningLift([goal("Book club", 6)], 80);
    expect(lift.goals[0].responsiveness).toBeCloseTo(0.55);
    expect(lift.goals[0].relief).toBeGreaterThan(0);
  });

  it("reports the best-responding situation and total relief", () => {
    const lift = calculateListeningLift(
      [goal("Phone calls", 7), goal("Restaurant", 7)],
      85,
    );
    expect(lift.bestResponder).toBe("Phone calls");
    expect(lift.totalRelief).toBeCloseTo(
      lift.goals.reduce((s, g) => s + g.relief, 0),
    );
  });

  it("handles an empty map", () => {
    const lift = calculateListeningLift([], 80);
    expect(lift.goals).toEqual([]);
    expect(lift.bestResponder).toBeNull();
    expect(lift.totalRelief).toBe(0);
  });
});
