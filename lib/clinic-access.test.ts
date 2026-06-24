import { describe, expect, it } from "vitest";
import { clinicAccessFromRows, isSuspended } from "./clinic-access";

describe("isSuspended", () => {
  it("is true only for the explicit 'suspended' status", () => {
    expect(isSuspended("suspended")).toBe(true);
    expect(isSuspended("active")).toBe(false);
    expect(isSuspended(null)).toBe(false);
    expect(isSuspended(undefined)).toBe(false);
    expect(isSuspended("weird")).toBe(false);
  });
});

describe("clinicAccessFromRows", () => {
  it("returns no_clinic when there is no profile or no clinic_id (onboarding)", () => {
    expect(clinicAccessFromRows(null, null)).toEqual({ state: "no_clinic" });
    expect(clinicAccessFromRows({}, null)).toEqual({ state: "no_clinic" });
    expect(clinicAccessFromRows({ clinic_id: null }, { account_status: "active" })).toEqual({
      state: "no_clinic",
    });
  });

  it("returns suspended only when the clinic is positively suspended", () => {
    expect(
      clinicAccessFromRows({ clinic_id: "c1" }, { account_status: "suspended" }),
    ).toEqual({ state: "suspended", clinicId: "c1" });
  });

  it("returns active for an active clinic", () => {
    expect(
      clinicAccessFromRows({ clinic_id: "c1" }, { account_status: "active" }),
    ).toEqual({ state: "active", clinicId: "c1" });
  });

  it("never blocks on ambiguity (missing clinic row or null status → active)", () => {
    expect(clinicAccessFromRows({ clinic_id: "c1" }, null)).toEqual({
      state: "active",
      clinicId: "c1",
    });
    expect(
      clinicAccessFromRows({ clinic_id: "c1" }, { account_status: null }),
    ).toEqual({ state: "active", clinicId: "c1" });
  });
});
