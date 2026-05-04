import { describe, it, expect } from "vitest";
import { getDefaultWizardState, localDateString } from "./types";

describe("localDateString", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const result = localDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("getDefaultWizardState", () => {
  it("returns empty patientName", () => {
    expect(getDefaultWizardState().patientName).toBe("");
  });

  it("initializes consultDate to empty string (date is set client-side via useEffect)", () => {
    expect(getDefaultWizardState().consultDate).toBe("");
  });

  it("defaults isFollowUp to false", () => {
    expect(getDefaultWizardState().isFollowUp).toBe(false);
  });

  it("defaults clinical fields to null", () => {
    const state = getDefaultWizardState();
    expect(state.pta).toBeNull();
    expect(state.wrs).toBeNull();
    expect(state.durationYears).toBeNull();
  });

  it("defaults sliders to 5", () => {
    const state = getDefaultWizardState();
    expect(state.fatigue).toBe(5);
    expect(state.avoidNoise).toBe(5);
    expect(state.repeats).toBe(5);
    expect(state.tvVolume).toBe(5);
    expect(state.conversation).toBe(5);
  });

  it("returns a new object on each call (no shared reference)", () => {
    const a = getDefaultWizardState();
    const b = getDefaultWizardState();
    expect(a).not.toBe(b);
    a.patientName = "Modified";
    expect(b.patientName).toBe("");
  });

  it("returns empty listeningSituations array", () => {
    expect(getDefaultWizardState().listeningSituations).toEqual([]);
  });

  it("resets values when called after mutation", () => {
    const state = getDefaultWizardState();
    state.patientName = "Old Patient";
    state.pta = 60;
    state.isFollowUp = true;

    const fresh = getDefaultWizardState();
    expect(fresh.patientName).toBe("");
    expect(fresh.pta).toBeNull();
    expect(fresh.isFollowUp).toBe(false);
  });
});
