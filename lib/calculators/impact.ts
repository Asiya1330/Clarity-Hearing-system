/**
 * OViz Impact Calculator — v1.1.0
 *
 * Produces educational projections for the OViz consult flow. The numbers
 * below are transparent heuristics, not validated clinical predictions. They
 * exist to drive a visualization that supports a conversation between a
 * patient and a hearing care provider.
 *
 * Outputs are educational scenarios based on today's inputs. They are not a
 * diagnosis, a guarantee, or a substitute for clinician judgment.
 *
 * Treatment effects modeled here express plausible directionality of common
 * intervention benefits (reduced listening effort, slower WRS drift, wider
 * social engagement). They do not assert that intervention restores normal
 * hearing, prevents disease, or reduces dementia risk.
 *
 * v1.1.0 changes:
 * - Partner Impact: secondsPerRepeat moved from 5 to 10. Three new optional
 *   partner-reported inputs (frustration, avoidance, social impact) drive a
 *   text summary; they do not feed quantitative outputs.
 * - Listening Map: priority is a weighted average (0.6×difficulty +
 *   0.4×importance) on a 0..10 scale. Top goals capped at 3 so the consult
 *   focuses on what the patient picked.
 */

export const MODEL_VERSION = "v1.1.0";

const SECONDS_PER_REPEAT = 10;

export interface ListeningSituation {
  name?: string;
  difficulty: number;
  importance: number;
}

export interface ImpactInputs {
  pta: number;
  wrs: number;
  durationYears: number;
  fatigue: number;
  avoidNoise: number;
  repeats: number;
  tvVolume: number;
  conversation: number;
  partnerRepeatsPerDay?: number;
  partnerFrustration?: number;
  partnerAvoidance?: number;
  partnerSocialImpact?: number;
  listeningSituations?: ListeningSituation[];
}

export interface BrainBattery {
  brainLoad: number;
  untreatedDrain: number;
  treatedDrain: number;
}

export interface WordUnderstanding {
  current: number;
  untreated5Year: number;
  treated5Year: number;
  label: string;
}

export interface SocialRadius {
  socialStrain: number;
  currentRadius: number;
  treatedRadius: number;
}

export interface PartnerImpact {
  repeatsPerDay: number;
  secondsPerRepeat: number;
  annualPartnerHours: number;
  partnerImpactSummary: string;
}

export interface TopGoal {
  name?: string;
  difficulty: number;
  importance: number;
  priorityScore: number;
}

export interface ListeningMap {
  topGoals: TopGoal[];
}

export interface ImpactOutputs {
  modelVersion: string;
  brainBattery: BrainBattery;
  wordUnderstanding: WordUnderstanding;
  socialRadius: SocialRadius;
  partnerImpact: PartnerImpact;
  listeningMap: ListeningMap;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clampOptional(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  return clamp(value, min, max);
}

function wordUnderstandingLabel(wrs: number): string {
  if (wrs >= 90) return "Excellent word understanding today";
  if (wrs >= 80) return "Good word understanding today";
  if (wrs >= 60) return "Reduced word understanding today";
  if (wrs >= 40) return "Markedly reduced word understanding today";
  return "Very limited word understanding today";
}

function buildPartnerImpactSummary(
  frustration: number | undefined,
  avoidance: number | undefined,
  socialImpact: number | undefined,
): string {
  const captured = [frustration, avoidance, socialImpact].filter(
    (v): v is number => typeof v === "number",
  );
  if (captured.length === 0) {
    return "Partner-reported strain was not captured today.";
  }
  const peak = Math.max(...captured);
  if (peak >= 7) {
    return "This hearing difficulty may be affecting both of you. Partner-reported strain is high today.";
  }
  if (peak >= 4) {
    return "This hearing difficulty may be affecting both of you. Partner-reported strain is moderate today.";
  }
  return "Partner-reported strain appears low today.";
}

export function calculateImpact(inputs: ImpactInputs): ImpactOutputs {
  // Defense-in-depth clamping. Routes use zod for loud validation; this keeps
  // the calculator from emitting NaN or runaway numbers if a caller bypasses
  // validation. Output ranges remain bounded for any input.
  const pta = clamp(inputs.pta, 0, 120);
  const wrs = clamp(inputs.wrs, 0, 100);
  const durationYears = clamp(inputs.durationYears, 0, 80);
  const fatigue = clamp(inputs.fatigue, 0, 10);
  const avoidNoise = clamp(inputs.avoidNoise, 0, 10);
  const repeats = clamp(inputs.repeats, 0, 10);
  const tvVolume = clamp(inputs.tvVolume, 0, 10);
  const conversation = clamp(inputs.conversation, 0, 10);
  const partnerFrustration = clampOptional(inputs.partnerFrustration, 0, 10);
  const partnerAvoidance = clampOptional(inputs.partnerAvoidance, 0, 10);
  const partnerSocialImpact = clampOptional(
    inputs.partnerSocialImpact,
    0,
    10,
  );

  const symptomAvg =
    (fatigue + avoidNoise + repeats + tvVolume + conversation) / 5;

  // --- Brain Battery -------------------------------------------------------
  const ptaContribution = (Math.min(pta, 80) / 80) * 50;
  const wrsContribution = ((100 - wrs) / 100) * 30;
  const symptomContribution = symptomAvg * 2;
  const brainLoad = clamp(
    ptaContribution + wrsContribution + symptomContribution,
    0,
    100,
  );

  const headroom = 100 - brainLoad;
  const yearsFactor = Math.min(durationYears / 20, 1);
  const drainMultiplier = 0.5 + 0.5 * yearsFactor;
  const untreatedDrain = clamp(headroom * 0.4 * drainMultiplier, 0, headroom);
  const treatedDrain = clamp(untreatedDrain * 0.3, 0, untreatedDrain);

  // --- Word Understanding --------------------------------------------------
  const annualWrsDrift = 1 + Math.max(pta - 40, 0) / 20;
  const untreated5Year = clamp(wrs - annualWrsDrift * 5, 0, 100);
  const treated5Year = clamp(wrs - annualWrsDrift * 1, 0, 100);

  // --- Social Radius -------------------------------------------------------
  const ptaStrain = (Math.min(pta, 80) / 80) * 40;
  const avoidStrain = avoidNoise * 3;
  const convStrain = conversation * 3;
  const socialStrain = clamp(ptaStrain + avoidStrain + convStrain, 0, 100);
  const currentRadius = clamp((100 - socialStrain) / 10, 0, 10);
  const treatedRadius = clamp(
    currentRadius + (10 - currentRadius) * 0.5,
    0,
    10,
  );

  // --- Partner Impact ------------------------------------------------------
  // Repeat burden uses a visible 10-second-per-repeat assumption.
  // Partner-reported sliders feed only the qualitative summary string.
  const inferredRepeats = repeats * 5;
  const repeatsPerDay =
    inputs.partnerRepeatsPerDay !== undefined
      ? clamp(inputs.partnerRepeatsPerDay, 0, 500)
      : clamp(inferredRepeats, 0, 500);
  const annualPartnerHours =
    (repeatsPerDay * SECONDS_PER_REPEAT * 365) / 3600;
  const partnerImpactSummary = buildPartnerImpactSummary(
    partnerFrustration,
    partnerAvoidance,
    partnerSocialImpact,
  );

  // --- Listening Map -------------------------------------------------------
  // Priority is a weighted average on a 0..10 scale: difficulty weighted
  // slightly higher than importance (0.6 / 0.4). Patient picks up to three
  // situations, so the top three are surfaced.
  const topGoals: TopGoal[] = (inputs.listeningSituations ?? [])
    .map((s) => {
      const d = clamp(s.difficulty, 0, 10);
      const i = clamp(s.importance, 0, 10);
      return {
        name: s.name,
        difficulty: d,
        importance: i,
        priorityScore: d * 0.6 + i * 0.4,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  return {
    modelVersion: MODEL_VERSION,
    brainBattery: {
      brainLoad,
      untreatedDrain,
      treatedDrain,
    },
    wordUnderstanding: {
      current: wrs,
      untreated5Year,
      treated5Year,
      label: wordUnderstandingLabel(wrs),
    },
    socialRadius: {
      socialStrain,
      currentRadius,
      treatedRadius,
    },
    partnerImpact: {
      repeatsPerDay,
      secondsPerRepeat: SECONDS_PER_REPEAT,
      annualPartnerHours,
      partnerImpactSummary,
    },
    listeningMap: {
      topGoals,
    },
  };
}
