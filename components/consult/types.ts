export interface ListeningSituationState {
  name: string;
  difficulty: number;
  importance: number;
}

export interface WizardState {
  // Patient information (Step 1)
  patientName: string;
  consultDate: string; // YYYY-MM-DD
  isFollowUp: boolean;
  // Clinician inputs (Step 2)
  pta: number | null;
  wrs: number | null;
  durationYears: number | null;
  // Patient sliders (Step 3)
  fatigue: number;
  avoidNoise: number;
  repeats: number;
  tvVolume: number;
  conversation: number;
  // Partner impact (Step 4)
  partnerRepeatsPerDay: number | null;
  partnerParticipated: boolean;
  partnerFrustration: number;
  partnerAvoidance: number;
  partnerSocialImpact: number;
  // Listening map (Step 5)
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
  { id: "patient", label: "Patient" },
  { id: "clinician", label: "Clinician Inputs" },
  { id: "sliders", label: "Patient Sliders" },
  { id: "partner", label: "Partner Impact" },
  { id: "listening", label: "Listening Map" },
  { id: "review", label: "Review & Save" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function localDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDefaultWizardState(): WizardState {
  return {
    patientName: "",
    consultDate: "",
    isFollowUp: false,
    pta: null,
    wrs: null,
    durationYears: null,
    fatigue: 5,
    avoidNoise: 5,
    repeats: 5,
    tvVolume: 5,
    conversation: 5,
    partnerRepeatsPerDay: null,
    partnerParticipated: false,
    partnerFrustration: 5,
    partnerAvoidance: 5,
    partnerSocialImpact: 5,
    listeningSituations: [],
  };
}
