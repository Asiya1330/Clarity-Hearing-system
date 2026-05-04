export interface ListeningSituationState {
  name: string;
  difficulty: number;
  importance: number;
}

export interface WizardState {
  pta: number | null;
  wrs: number | null;
  durationYears: number | null;
  fatigue: number;
  avoidNoise: number;
  repeats: number;
  tvVolume: number;
  conversation: number;
  partnerRepeatsPerDay: number | null;
  partnerParticipated: boolean;
  partnerFrustration: number;
  partnerAvoidance: number;
  partnerSocialImpact: number;
  listeningSituations: ListeningSituationState[];
}

export interface StepProps {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
}

export const LISTENING_PRESETS: string[] = [
  "Restaurant",
  "Family dinner",
  "TV",
  "Phone calls",
  "Car conversations",
  "Meetings",
  "Church/community events",
  "Grandchildren",
  "Medical appointments",
];

export const MAX_LISTENING_SITUATIONS = 3;

export const STEPS = [
  { id: "clinician", label: "Clinician Inputs" },
  { id: "sliders", label: "Patient Sliders" },
  { id: "partner", label: "Partner Impact" },
  { id: "listening", label: "Listening Map" },
  { id: "review", label: "Review & Save" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
