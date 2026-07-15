import { z } from 'zod'

import { BUDGET_BANDS, COOKING_SKILLS } from '../households/types'

export const profileDetailsSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter the name you would like us to use.').max(100),
  timezone: z.string().trim().min(1).max(100),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
})

export const householdNameSchema = z.object({
  name: z.string().trim().min(1, 'Give your household a name.').max(100),
})

export const householdPreferencesSchema = z.object({
  defaultServings: z.number().int().min(1).max(20),
  weeknightMaxMinutes: z.number().int().min(5).max(240),
  weekendMaxMinutes: z.number().int().min(5).max(480),
  cookingSkill: z.enum(COOKING_SKILLS),
  budgetBand: z.enum(BUDGET_BANDS),
  defaultStore: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  preferredPlanningDay: z.number().int().min(0).max(6),
})

const preferenceList = z.array(z.string().trim().min(1).max(100)).max(20)
export const dietaryPreferencesSchema = z.object({
  requirements: preferenceList,
  allergies: preferenceList,
})
