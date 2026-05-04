import { describe, it, expect } from "vitest";
import { ConsultMetaSchema, FullConsultBodySchema } from "./consult";

const validMeta = {
  consultDate: "2025-06-15",
  isFollowUp: false,
};

const validClinical = {
  pta: 40,
  wrs: 80,
  durationYears: 5,
  fatigue: 5,
  avoidNoise: 5,
  repeats: 5,
  tvVolume: 5,
  conversation: 5,
};

describe("ConsultMetaSchema", () => {
  it("accepts valid meta", () => {
    expect(ConsultMetaSchema.safeParse(validMeta).success).toBe(true);
  });

  it("defaults isFollowUp to false when omitted", () => {
    const result = ConsultMetaSchema.safeParse({ consultDate: "2025-06-15" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isFollowUp).toBe(false);
  });

  it("trims whitespace from patientName", () => {
    const result = ConsultMetaSchema.safeParse({
      ...validMeta,
      patientName: "  Alex Patient  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientName).toBe("Alex Patient");
  });

  it("accepts empty patientName as undefined", () => {
    const result = ConsultMetaSchema.safeParse(validMeta);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientName).toBeUndefined();
  });

  it("rejects patientName over 120 characters", () => {
    const result = ConsultMetaSchema.safeParse({
      ...validMeta,
      patientName: "A".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-date consultDate", () => {
    expect(
      ConsultMetaSchema.safeParse({ ...validMeta, consultDate: "not-a-date" })
        .success
    ).toBe(false);
  });

  it("rejects consultDate with wrong format (MM/DD/YYYY)", () => {
    expect(
      ConsultMetaSchema.safeParse({ ...validMeta, consultDate: "06/15/2025" })
        .success
    ).toBe(false);
  });

  it("rejects invalid calendar date", () => {
    expect(
      ConsultMetaSchema.safeParse({ ...validMeta, consultDate: "2025-13-01" })
        .success
    ).toBe(false);
  });

  it("requires consultDate", () => {
    expect(
      ConsultMetaSchema.safeParse({ isFollowUp: false }).success
    ).toBe(false);
  });
});

describe("FullConsultBodySchema", () => {
  it("accepts valid full body", () => {
    const result = FullConsultBodySchema.safeParse({
      ...validClinical,
      ...validMeta,
    });
    expect(result.success).toBe(true);
  });

  it("rejects pta out of range", () => {
    expect(
      FullConsultBodySchema.safeParse({
        ...validClinical,
        ...validMeta,
        pta: 121,
      }).success
    ).toBe(false);
  });

  it("rejects wrs out of range", () => {
    expect(
      FullConsultBodySchema.safeParse({
        ...validClinical,
        ...validMeta,
        wrs: 101,
      }).success
    ).toBe(false);
  });
});
