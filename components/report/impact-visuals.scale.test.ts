import { describe, expect, it } from "vitest";

import { wuXScale, wuYearSeries, wuYScale } from "./impact-visuals";

describe("wuYScale — nonlinear percent→Y", () => {
  it("maps the anchor stops", () => {
    expect(wuYScale(100)).toBeCloseTo(55, 5);
    expect(wuYScale(0)).toBeCloseTo(315, 5);
    expect(wuYScale(50)).toBeCloseTo(285, 5);
  });

  it("decreases monotonically as percent rises", () => {
    let prev = wuYScale(0);
    for (let p = 1; p <= 100; p++) {
      const cur = wuYScale(p);
      expect(cur).toBeLessThan(prev);
      prev = cur;
    }
  });

  it("expands 60–100 vs 0–50 (more pixels per percent up top)", () => {
    const pppHigh = Math.abs(wuYScale(60) - wuYScale(100)) / (100 - 60);
    const pppLow = Math.abs(wuYScale(0) - wuYScale(50)) / (50 - 0);
    expect(pppHigh).toBeGreaterThan(pppLow);
  });

  it("clamps inputs to [0,100]", () => {
    expect(wuYScale(150)).toBe(wuYScale(100));
    expect(wuYScale(-10)).toBe(wuYScale(0));
  });
});

describe("wuXScale — evenly spaced year columns", () => {
  it("anchors the plot at x ∈ [90, 560]", () => {
    expect(wuXScale(0)).toBe(90);
    expect(wuXScale(5)).toBe(560);
  });

  it("spaces years evenly", () => {
    const step = wuXScale(1) - wuXScale(0);
    for (let year = 1; year <= 5; year++) {
      expect(wuXScale(year) - wuXScale(year - 1)).toBeCloseTo(step, 6);
    }
  });
});

describe("wuYearSeries — linear interpolation between year 0 and year 5", () => {
  it("interpolates 80→70 across six years", () => {
    expect(wuYearSeries(80, 70)).toEqual([80, 78, 76, 74, 72, 70]);
  });

  it("pins the endpoints and length", () => {
    const series = wuYearSeries(64, 91);
    expect(series).toHaveLength(6);
    expect(series[0]).toBe(64);
    expect(series[5]).toBe(91);
  });

  it("clamps current and endpoint to [0,100]", () => {
    const series = wuYearSeries(120, -5);
    expect(series[0]).toBe(100);
    expect(series[5]).toBe(0);
  });
});
