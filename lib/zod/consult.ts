import { z } from "zod";

export const ListeningSituationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  difficulty: z.number().min(0).max(10),
  importance: z.number().min(0).max(10),
});

export const ConsultInputSchema = z.object({
  pta: z.number().min(0).max(120),
  wrs: z.number().min(0).max(100),
  durationYears: z.number().min(0).max(80),
  fatigue: z.number().min(0).max(10),
  avoidNoise: z.number().min(0).max(10),
  repeats: z.number().min(0).max(10),
  tvVolume: z.number().min(0).max(10),
  conversation: z.number().min(0).max(10),
  partnerRepeatsPerDay: z.number().min(0).max(500).optional(),
  partnerFrustration: z.number().min(0).max(10).optional(),
  partnerAvoidance: z.number().min(0).max(10).optional(),
  partnerSocialImpact: z.number().min(0).max(10).optional(),
  listeningSituations: z.array(ListeningSituationSchema).max(3).optional(),
});

export const ConsultMetaSchema = z.object({
  patientName: z
    .string()
    .trim()
    .max(120, "Patient name must be 120 characters or fewer.")
    .optional(),
  consultDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date."),
  isFollowUp: z.boolean().default(false),
});

export const FullConsultBodySchema = ConsultInputSchema.merge(ConsultMetaSchema);

export type ConsultInput = z.infer<typeof ConsultInputSchema>;
export type ConsultMeta = z.infer<typeof ConsultMetaSchema>;
export type FullConsultBody = z.infer<typeof FullConsultBodySchema>;
