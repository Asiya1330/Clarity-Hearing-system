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

export type ConsultInput = z.infer<typeof ConsultInputSchema>;
