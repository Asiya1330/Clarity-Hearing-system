import { z } from "zod";
import { ConsultInputSchema, ConsultMetaSchema } from "./consult";

/**
 * The patient-answerable subset of a consult: self-reported sliders,
 * partner impact, and the listening map. Derived from ConsultInputSchema
 * so ranges stay in one place.
 */
export const PatientResponsesSchema = ConsultInputSchema.pick({
  fatigue: true,
  avoidNoise: true,
  repeats: true,
  tvVolume: true,
  conversation: true,
  partnerRepeatsPerDay: true,
  partnerFrustration: true,
  partnerAvoidance: true,
  partnerSocialImpact: true,
  listeningSituations: true,
});

/** Clinician-only inputs, entered from today's audiology results. */
export const ClinicianInputsSchema = ConsultInputSchema.pick({
  pta: true,
  wrs: true,
  durationYears: true,
});

/** Body for POST /api/intake — start a kiosk or email intake. */
export const CreateIntakeSchema = ConsultMetaSchema.extend({
  mode: z.enum(["kiosk", "email"]),
  patientEmail: z.string().email().optional(),
}).refine((v) => v.mode !== "email" || !!v.patientEmail, {
  message: "Patient email is required for email intake.",
  path: ["patientEmail"],
});

export type PatientResponses = z.infer<typeof PatientResponsesSchema>;
export type ClinicianInputs = z.infer<typeof ClinicianInputsSchema>;
export type CreateIntake = z.infer<typeof CreateIntakeSchema>;
