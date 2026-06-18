/**
 * OViz Audiogram → Conversation — standalone demonstration engine.
 *
 * Turns a set of pure-tone thresholds into the plain-language story a clinician
 * walks a patient through: which speech sounds fall below the patient's hearing,
 * why noisy rooms are tiring, and what amplification is modeled to give back.
 *
 * This module is intentionally framework-free and side-effect-free so it can be
 * unit-tested in isolation and reused by any view. It is the single source of
 * truth for the tool's formulas and state shape.
 *
 * Design constraints (consistent with lib/calculators/*):
 *  - Transparent, defensible heuristics for a consult-room demonstration — not a
 *    diagnostic reading, and not a hearing-aid fitting prescription (real targets
 *    use NAL-NL2 / DSL).
 *  - Treatment is partial, never restorative: the modeled aid uses a simplified
 *    half-gain rule and is capped, so the softest sounds can remain out of reach.
 *  - Audibility is decided by a single honest test: a sound is heard only if it
 *    is louder than the threshold at its pitch (L >= T(f)).
 */

export const AUDIOGRAM_CONVERSATION_VERSION = "v1.0.0";

/** Octave test frequencies (Hz), low → high pitch. */
export const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** Thresholds in dB HL keyed by frequency. Lower = better hearing. */
export type Thresholds = Record<number, number>;

export const THRESHOLD_MIN = -10;
export const THRESHOLD_MAX = 120;
export const THRESHOLD_STEP = 5;

export type PresetKey = "normal" | "hf" | "flat" | "severe";

export const PRESET_LABELS: Record<PresetKey, string> = {
  normal: "Normal hearing",
  hf: "High-frequency loss",
  flat: "Moderate, flat",
  severe: "Severe sloping",
};

/** Example hearing profiles a clinician can load with one tap. */
export const THRESHOLD_PRESETS: Record<PresetKey, Thresholds> = {
  normal: { 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 15, 8000: 20 },
  hf: { 250: 15, 500: 20, 1000: 25, 2000: 45, 4000: 65, 8000: 75 },
  flat: { 250: 45, 500: 45, 1000: 50, 2000: 50, 4000: 50, 8000: 55 },
  severe: { 250: 30, 500: 40, 1000: 55, 2000: 70, 4000: 85, 8000: 90 },
};

export const DEFAULT_PRESET: PresetKey = "hf";

export type PhonemeGroup = "vowel" | "consonant";

export interface Phoneme {
  symbol: string;
  /** Characteristic pitch (Hz). */
  frequency: number;
  /** Characteristic conversational level (dB HL). */
  level: number;
  group: PhonemeGroup;
  /** True for the soft, intelligibility-carrying consonants /s/ /f/ /θ/. */
  soft?: boolean;
}

/**
 * Representative speech-sound positions (the "speech banana"). Vowels sit low
 * and loud; the soft voiceless fricatives /s/ /f/ /θ/ sit high and quiet, which
 * is why a high-frequency loss takes intelligibility before it takes volume.
 * Frequencies are spaced so the on-chart letters do not overlap.
 */
export const PHONEMES: Phoneme[] = [
  { symbol: "m", frequency: 250, level: 38, group: "vowel" },
  { symbol: "u", frequency: 420, level: 48, group: "vowel" },
  { symbol: "a", frequency: 780, level: 52, group: "vowel" },
  { symbol: "n", frequency: 1150, level: 38, group: "vowel" },
  { symbol: "sh", frequency: 2800, level: 42, group: "consonant" },
  { symbol: "k", frequency: 3500, level: 32, group: "consonant" },
  { symbol: "f", frequency: 4600, level: 30, group: "consonant", soft: true },
  { symbol: "th", frequency: 6000, level: 30, group: "consonant", soft: true },
  { symbol: "s", frequency: 7600, level: 30, group: "consonant", soft: true },
];

/** Upper/lower dB bounds of the speech-banana outline, per test frequency. */
export const SPEECH_BANANA: Record<number, [number, number]> = {
  250: [20, 45],
  500: [15, 48],
  1000: [15, 48],
  2000: [20, 52],
  4000: [25, 55],
  8000: [25, 55],
};

export type SeverityKey =
  | "normal"
  | "mild"
  | "moderate"
  | "modSevere"
  | "severe"
  | "profound";

export interface SeverityBand {
  /** Inclusive upper edge in dB HL (top of the band on the chart). */
  topDb: number;
  /** Inclusive lower edge in dB HL (bottom of the band on the chart). */
  bottomDb: number;
  key: SeverityKey;
  label: string;
}

/** Standard degree-of-loss ranges, top (good) → bottom (profound). */
export const SEVERITY_BANDS: SeverityBand[] = [
  { topDb: -10, bottomDb: 25, key: "normal", label: "Normal" },
  { topDb: 25, bottomDb: 40, key: "mild", label: "Mild" },
  { topDb: 40, bottomDb: 55, key: "moderate", label: "Moderate" },
  { topDb: 55, bottomDb: 70, key: "modSevere", label: "Mod. severe" },
  { topDb: 70, bottomDb: 90, key: "severe", label: "Severe" },
  { topDb: 90, bottomDb: 120, key: "profound", label: "Profound" },
];

/** Soft consonants that carry intelligibility, used by the first chip. */
const SOFT_CONSONANTS = PHONEMES.filter((p) => p.soft).map((p) => p.symbol);

/** Clarity-gap threshold (dB) at which following speech in noise turns effortful. */
const EFFORT_GAP_DB = 18;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Threshold at an arbitrary frequency, interpolated linearly in log-frequency
 * between the measured octave points (and clamped to the endpoints).
 */
export function thresholdAt(thresholds: Thresholds, frequency: number): number {
  const first = FREQUENCIES[0];
  const last = FREQUENCIES[FREQUENCIES.length - 1];
  if (frequency <= first) return thresholds[first];
  if (frequency >= last) return thresholds[last];
  for (let i = 0; i < FREQUENCIES.length - 1; i++) {
    const a = FREQUENCIES[i];
    const b = FREQUENCIES[i + 1];
    if (frequency >= a && frequency <= b) {
      const t =
        (Math.log2(frequency) - Math.log2(a)) / (Math.log2(b) - Math.log2(a));
      return thresholds[a] + t * (thresholds[b] - thresholds[a]);
    }
  }
  return thresholds[last];
}

/**
 * Simplified half-gain rule: target gain ≈ 0.5 × (threshold − 15), only where
 * loss exists, capped at 35 dB. Illustrative, not a fitting prescription.
 */
export function gainAt(thresholds: Thresholds, frequency: number): number {
  return Math.min(35, Math.max(0, 0.5 * (thresholdAt(thresholds, frequency) - 15)));
}

/** Modeled aided threshold = unaided threshold lifted by the modeled gain. */
export function aidedThresholdAt(
  thresholds: Thresholds,
  frequency: number,
): number {
  return thresholdAt(thresholds, frequency) - gainAt(thresholds, frequency);
}

/** Pure-tone average of the speech frequencies (500/1k/2k Hz). */
export function pureToneAverage(thresholds: Thresholds): number {
  return mean([thresholds[500], thresholds[1000], thresholds[2000]]);
}

/** High-pitch average (2k/4k/8k) minus low-pitch average (250/500/1k). */
export function clarityGap(thresholds: Thresholds): number {
  const high = mean([thresholds[2000], thresholds[4000], thresholds[8000]]);
  const low = mean([thresholds[250], thresholds[500], thresholds[1000]]);
  return high - low;
}

export function severityKey(db: number): SeverityKey {
  for (const band of SEVERITY_BANDS) {
    if (db <= band.bottomDb) return band.key;
  }
  return "profound";
}

export function degreeLabel(db: number): string {
  const key = severityKey(db);
  return SEVERITY_BANDS.find((b) => b.key === key)!.label;
}

/**
 * A speech sound is audible only if it is louder than the threshold at its
 * pitch. When `aided` is true, the modeled aided threshold is used instead.
 */
export function isAudible(
  thresholds: Thresholds,
  phoneme: Phoneme,
  aided: boolean,
): boolean {
  const threshold = aided
    ? aidedThresholdAt(thresholds, phoneme.frequency)
    : thresholdAt(thresholds, phoneme.frequency);
  return phoneme.level >= threshold;
}

export type ChipId = "consonants" | "effort" | "treatment";
export type ChipIntent = "alert" | "warn" | "good" | "muted";

export interface OutcomeChip {
  id: ChipId;
  title: string;
  /** Short status word for the colour-coded tag (e.g. "Missed", "Restored"). */
  tag: string;
  /** Plain-language sentence, derived from the data. */
  detail: string;
  /** Whether the chip represents a live finding (drives the highlighted state). */
  active: boolean;
  intent: ChipIntent;
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

const softSlash = (p: Phoneme) => `/${p.symbol}/`;

/**
 * Derive the three outcome chips straight off the audibility test.
 * These are the plain-language translation of the chart.
 */
export function deriveChips(
  thresholds: Thresholds,
  aided: boolean,
): OutcomeChip[] {
  const consonants = PHONEMES.filter((p) => p.group === "consonant");

  // 1 · Soft consonants slip past (always evaluated unaided — it is the problem
  //     statement the clinician is explaining).
  const missedSoft = PHONEMES.filter(
    (p) =>
      p.group === "consonant" &&
      SOFT_CONSONANTS.includes(p.symbol) &&
      p.level < thresholdAt(thresholds, p.frequency),
  );
  const consonantsChip: OutcomeChip = missedSoft.length
    ? {
        id: "consonants",
        title: "Soft consonants slip past",
        tag: "Missed",
        active: true,
        intent: "alert",
        detail: `${formatList(missedSoft.map(softSlash))} fall ${Math.round(
          Math.max(
            ...missedSoft.map(
              (p) => thresholdAt(thresholds, p.frequency) - p.level,
            ),
          ),
        )} dB below threshold — the sounds that carry meaning.`,
      }
    : {
        id: "consonants",
        title: "Soft consonants slip past",
        tag: "Audible",
        active: false,
        intent: "muted",
        detail: "These soft, high sounds are still getting through.",
      };

  // 2 · Noisy rooms are exhausting — driven by the clarity gap.
  const gap = Math.round(clarityGap(thresholds));
  const consonantsMissed = consonants.filter(
    (p) => p.level < thresholdAt(thresholds, p.frequency),
  ).length;
  const effortChip: OutcomeChip =
    gap >= EFFORT_GAP_DB || consonantsMissed >= 2
      ? {
          id: "effort",
          title: "Noisy rooms are exhausting",
          tag: "Effort",
          active: true,
          intent: "warn",
          detail: `High-pitch detail drops ${gap} dB below the vowels — following the dinner table takes real work.`,
        }
      : {
          id: "effort",
          title: "Noisy rooms are exhausting",
          tag: "Steady",
          active: false,
          intent: "muted",
          detail: "Pitches are close together — speech holds up well in noise.",
        };

  // 3 · What treatment gives back — recomputed against the modeled aided curve.
  const missedUnaided = consonants.filter(
    (p) => p.level < thresholdAt(thresholds, p.frequency),
  );
  const restored = consonants
    .filter(
      (p) =>
        p.level < thresholdAt(thresholds, p.frequency) &&
        p.level >= aidedThresholdAt(thresholds, p.frequency),
    )
    .map(softSlash);

  let treatmentChip: OutcomeChip;
  if (!aided) {
    treatmentChip = {
      id: "treatment",
      title: "What treatment gives back",
      tag: "Preview",
      active: false,
      intent: "muted",
      detail:
        "Turn on hearing aids to see the same chart as a path forward.",
    };
  } else if (restored.length) {
    treatmentChip = {
      id: "treatment",
      title: "What treatment gives back",
      tag: "Restored",
      active: true,
      intent: "good",
      detail: `Modeled aids bring back ${formatList(
        restored,
      )} — words get their edges back.`,
    };
  } else if (missedUnaided.length === 0) {
    treatmentChip = {
      id: "treatment",
      title: "What treatment gives back",
      tag: "Comfort",
      active: false,
      intent: "muted",
      detail: "Already audible — aids mainly add ease and comfort in noise.",
    };
  } else {
    treatmentChip = {
      id: "treatment",
      title: "What treatment gives back",
      tag: "Manage",
      active: true,
      intent: "good",
      detail:
        "Even aided, the softest sounds stay out of reach — worth setting expectations together.",
    };
  }

  return [consonantsChip, effortChip, treatmentChip];
}

/** One plain-language sentence summarising where the loss sits. */
export function buildCaption(thresholds: Thresholds): string {
  const pta = pureToneAverage(thresholds);
  const highAvg = mean([thresholds[2000], thresholds[4000], thresholds[8000]]);
  const gap = clarityGap(thresholds);

  if (pta <= 25 && highAvg <= 30) {
    return "Hearing sits in the normal range across all pitches — speech comes through clearly.";
  }
  if (gap >= EFFORT_GAP_DB) {
    return `Low pitches stay strong, but high pitches drop into the ${degreeLabel(
      highAvg,
    ).toLowerCase()} range — exactly where soft consonants live.`;
  }
  return `Hearing sits fairly evenly in the ${degreeLabel(
    pta,
  ).toLowerCase()} range across pitches.`;
}

export interface AudiogramReadout {
  /** Speech-frequency pure-tone average, rounded (dB HL). */
  pta: number;
  /** Degree label for the PTA (e.g. "Mild"). */
  degree: string;
  /** Severity key for the PTA (drives the degree-badge colour). */
  severity: SeverityKey;
  /** High − low pitch clarity gap, rounded (dB). */
  clarityGap: number;
}

export interface AudiogramModel {
  readout: AudiogramReadout;
  chips: OutcomeChip[];
  caption: string;
}

/** Bundle the readouts, chips and caption for a given state. */
export function computeAudiogram(
  thresholds: Thresholds,
  aided: boolean,
): AudiogramModel {
  const pta = Math.round(pureToneAverage(thresholds));
  return {
    readout: {
      pta,
      degree: degreeLabel(pta),
      severity: severityKey(pta),
      clarityGap: Math.round(clarityGap(thresholds)),
    },
    chips: deriveChips(thresholds, aided),
    caption: buildCaption(thresholds),
  };
}

/** Clamp a single threshold to the allowed range and step grid. */
export function clampThreshold(value: number): number {
  return clamp(Math.round(value / THRESHOLD_STEP) * THRESHOLD_STEP, THRESHOLD_MIN, THRESHOLD_MAX);
}
