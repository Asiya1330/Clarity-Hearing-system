/**
 * Zod payload schemas for owner-console server actions and route handlers.
 * Every console mutation validates its body through one of these.
 */

import { z } from "zod";
import { OWNER_CONSOLE_ROLES } from "./constants";

export const SuspendClinicSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required.").max(500),
  // Destructive-op guard: the UI asks the operator to type the clinic name.
  confirmText: z.string().trim().min(1),
});
export type SuspendClinicPayload = z.infer<typeof SuspendClinicSchema>;

export const ReactivateClinicSchema = z.object({
  confirmText: z.string().trim().min(1),
});
export type ReactivateClinicPayload = z.infer<typeof ReactivateClinicSchema>;

export const EntitlementsSchema = z.object({
  enable_kiosk_mode: z.boolean(),
  enable_presentation_mode: z.boolean(),
  enable_audiogram_ai_beta: z.boolean(),
  notes: z.string().trim().max(2000).nullish(),
});
export type EntitlementsPayload = z.infer<typeof EntitlementsSchema>;

export const DiagnosticEmailSchema = z.object({
  kind: z.enum(["diagnostic", "reset"]),
});
export type DiagnosticEmailPayload = z.infer<typeof DiagnosticEmailSchema>;

export const ExtendTrialSchema = z.object({
  days: z.number().int().positive().max(90).default(14),
});
export type ExtendTrialPayload = z.infer<typeof ExtendTrialSchema>;

export const ApplyCouponSchema = z.object({
  // Coupon id is sourced from STRIPE_RETENTION_COUPON_ID on the server; an
  // explicit override is accepted but optional.
  couponId: z.string().trim().min(1).max(200).optional(),
});
export type ApplyCouponPayload = z.infer<typeof ApplyCouponSchema>;

export const RevokeKioskSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type RevokeKioskPayload = z.infer<typeof RevokeKioskSchema>;

export const StaffInviteSchema = z.object({
  email: z.string().trim().email().max(320),
  // Staff can only ever be sub_admin; super_admin is reserved for the owner.
  role: z.literal("sub_admin").default("sub_admin"),
});
export type StaffInvitePayload = z.infer<typeof StaffInviteSchema>;

export const StaffRoleChangeSchema = z.object({
  role: z.enum(OWNER_CONSOLE_ROLES),
});
export type StaffRoleChangePayload = z.infer<typeof StaffRoleChangeSchema>;

export const SupportViewEventSchema = z.object({
  event: z.enum(["start", "close"]),
});
export type SupportViewEventPayload = z.infer<typeof SupportViewEventSchema>;
