import { z } from 'zod'

import {
  APPLICATION_ROLES,
  BUDGET_BANDS,
  CONSTRAINT_STRENGTHS,
  COOKING_ENJOYMENT_LEVELS,
  COOKING_SKILLS,
  HOUSEHOLD_ROLES,
  MEMBERSHIP_STATUSES,
  PREP_MODES,
} from './types'

const optionalTrimmedText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .optional()
    .transform((value) => value || undefined)

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).max(100),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
})

export const householdInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

export const householdMembershipInputSchema = z.object({
  userId: z.uuid(),
  role: z.enum(HOUSEHOLD_ROLES),
  status: z.enum(MEMBERSHIP_STATUSES),
})

export const appUserRoleInputSchema = z.object({
  userId: z.uuid(),
  role: z.enum(APPLICATION_ROLES),
})

export const householdSettingsInputSchema = z.object({
  defaultServings: z.number().int().min(1).max(20),
  weeknightMaxMinutes: z.number().int().min(5).max(240),
  weekendMaxMinutes: z.number().int().min(5).max(480),
  preferredPrepDay: z.number().int().min(0).max(6).optional(),
  prepMode: z.enum(PREP_MODES),
  defaultStore: optionalTrimmedText(100),
  budgetBand: z.enum(BUDGET_BANDS),
  cookingSkill: z.enum(COOKING_SKILLS),
  cookingEnjoyment: z.enum(COOKING_ENJOYMENT_LEVELS),
})

const memberScopeSchema = z.object({
  appliesToMemberId: z.uuid().optional(),
})

export const dietaryRequirementInputSchema = memberScopeSchema.extend({
  requirement: z.string().trim().min(1).max(100),
  strength: z.enum(CONSTRAINT_STRENGTHS),
  notes: optionalTrimmedText(500),
})

export const allergyInputSchema = memberScopeSchema.extend({
  allergen: z.string().trim().min(1).max(100),
  notes: optionalTrimmedText(500),
})

export type ProfileInput = z.infer<typeof profileInputSchema>
export type HouseholdInput = z.infer<typeof householdInputSchema>
export type HouseholdMembershipInput = z.infer<typeof householdMembershipInputSchema>
export type AppUserRoleInput = z.infer<typeof appUserRoleInputSchema>
export type HouseholdSettingsInput = z.infer<typeof householdSettingsInputSchema>
export type DietaryRequirementInput = z.infer<typeof dietaryRequirementInputSchema>
export type AllergyInput = z.infer<typeof allergyInputSchema>
