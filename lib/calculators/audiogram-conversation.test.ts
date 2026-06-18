import { describe, expect, it } from "vitest";

import {
  aidedThresholdAt,
  buildCaption,
  clampThreshold,
  clarityGap,
  computeAudiogram,
  deriveChips,
  degreeLabel,
  isAudible,
  PHONEMES,
  pureToneAverage,
  severityKey,
  THRESHOLD_PRESETS,
  thresholdAt,
} from "./audiogram-conversation";

const findChip = (
  thresholds: Record<number, number>,
  aided: boolean,
  id: "consonants" | "effort" | "treatment",
) => deriveChips(thresholds, aided).find((c) => c.id === id)!;

describe("thresholdAt", () => {
  it("returns measured values at the octave points", () => {
    const t = THRESHOLD_PRESETS.hf;
    expect(thresholdAt(t, 1000)).toBe(25);
    expect(thresholdAt(t, 4000)).toBe(65);
  });

  it("interpolates in log-frequency between points", () => {
    const t = THRESHOLD_PRESETS.hf;
    // halfway (in log space) between 2k (45) and 4k (65) is ~55 at ~2.83 kHz
    const v = thresholdAt(t, 2000 * Math.SQRT2);
    expect(v).toBeCloseTo(55, 5);
  });

  it("clamps below the first and above the last frequency", () => {
    const t = THRESHOLD_PRESETS.hf;
    expect(thresholdAt(t, 100)).toBe(t[250]);
    expect(thresholdAt(t, 16000)).toBe(t[8000]);
  });
});

describe("severity + averages", () => {
  it("maps PTA into the standard degree bands", () => {
    expect(degreeLabel(20)).toBe("Normal");
    expect(degreeLabel(30)).toBe("Mild");
    expect(degreeLabel(50)).toBe("Moderate");
    expect(degreeLabel(95)).toBe("Profound");
    expect(severityKey(60)).toBe("modSevere");
  });

  it("computes the speech-frequency PTA", () => {
    // hf: (20 + 25 + 45) / 3 = 30
    expect(pureToneAverage(THRESHOLD_PRESETS.hf)).toBeCloseTo(30, 5);
  });

  it("reports a large clarity gap for sloping loss and ~0 for flat loss", () => {
    expect(clarityGap(THRESHOLD_PRESETS.hf)).toBeGreaterThanOrEqual(40);
    expect(Math.abs(clarityGap(THRESHOLD_PRESETS.flat))).toBeLessThan(10);
  });
});

describe("audibility", () => {
  it("keeps all speech sounds audible for normal hearing", () => {
    for (const p of PHONEMES) {
      expect(isAudible(THRESHOLD_PRESETS.normal, p, false)).toBe(true);
    }
  });

  it("drops the soft high consonants for high-frequency loss", () => {
    const soft = PHONEMES.filter((p) => p.soft);
    for (const p of soft) {
      expect(isAudible(THRESHOLD_PRESETS.hf, p, false)).toBe(false);
    }
  });

  it("models aids that lift but never restore the very softest in severe loss", () => {
    // /s/ at 7.6 kHz, 30 dB — out of reach even aided in a severe sloping loss.
    const s = PHONEMES.find((p) => p.symbol === "s")!;
    expect(aidedThresholdAt(THRESHOLD_PRESETS.severe, s.frequency)).toBeGreaterThan(
      s.level,
    );
  });
});

describe("chips", () => {
  it("flags missed consonants and effort for high-frequency loss", () => {
    expect(findChip(THRESHOLD_PRESETS.hf, false, "consonants").active).toBe(true);
    expect(findChip(THRESHOLD_PRESETS.hf, false, "effort").active).toBe(true);
  });

  it("stays calm for normal hearing", () => {
    expect(findChip(THRESHOLD_PRESETS.normal, false, "consonants").active).toBe(
      false,
    );
    expect(findChip(THRESHOLD_PRESETS.normal, false, "effort").active).toBe(
      false,
    );
  });

  it("previews treatment only once aids are turned on", () => {
    expect(findChip(THRESHOLD_PRESETS.hf, false, "treatment").tag).toBe(
      "Preview",
    );
    expect(findChip(THRESHOLD_PRESETS.hf, true, "treatment").tag).toBe(
      "Restored",
    );
  });

  it("catches soft consonants even in a flat moderate loss", () => {
    // flat 50 dB still sits above the ~30 dB fricatives.
    expect(findChip(THRESHOLD_PRESETS.flat, false, "consonants").active).toBe(
      true,
    );
  });
});

describe("caption", () => {
  it("describes the high-frequency story for sloping loss", () => {
    expect(buildCaption(THRESHOLD_PRESETS.hf).toLowerCase()).toContain(
      "high pitches",
    );
  });

  it("reports the normal range when hearing is intact", () => {
    expect(buildCaption(THRESHOLD_PRESETS.normal).toLowerCase()).toContain(
      "normal range",
    );
  });
});

describe("computeAudiogram", () => {
  it("bundles readouts, chips and caption", () => {
    const model = computeAudiogram(THRESHOLD_PRESETS.hf, false);
    expect(model.readout.pta).toBe(30);
    expect(model.readout.degree).toBe("Mild");
    expect(model.chips).toHaveLength(3);
    expect(typeof model.caption).toBe("string");
  });
});

describe("clampThreshold", () => {
  it("snaps to the 5 dB grid and clamps to range", () => {
    expect(clampThreshold(43)).toBe(45);
    expect(clampThreshold(-50)).toBe(-10);
    expect(clampThreshold(999)).toBe(120);
  });
});
