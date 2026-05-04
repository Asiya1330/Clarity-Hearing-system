import type { ImpactInputs } from "@/lib/calculators/impact";
import type { WizardState } from "./types";

export function buildPayload(state: WizardState): ImpactInputs {
  return {
    pta: state.pta ?? 0,
    wrs: state.wrs ?? 0,
    durationYears: state.durationYears ?? 0,
    fatigue: state.fatigue,
    avoidNoise: state.avoidNoise,
    repeats: state.repeats,
    tvVolume: state.tvVolume,
    conversation: state.conversation,
    ...(state.partnerRepeatsPerDay !== null
      ? { partnerRepeatsPerDay: state.partnerRepeatsPerDay }
      : {}),
    ...(state.partnerParticipated
      ? {
          partnerFrustration: state.partnerFrustration,
          partnerAvoidance: state.partnerAvoidance,
          partnerSocialImpact: state.partnerSocialImpact,
        }
      : {}),
    listeningSituations: state.listeningSituations,
  };
}
