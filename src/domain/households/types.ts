export const HOUSEHOLD_STATUSES = ['active', 'archived'] as const
export const HOUSEHOLD_ROLES = ['owner', 'member'] as const
export const MEMBERSHIP_STATUSES = ['active', 'inactive'] as const
export const APPLICATION_ROLES = ['admin', 'content_editor', 'support'] as const
export const PREP_MODES = ['no_prep', 'quick', 'standard', 'batch'] as const
export const BUDGET_BANDS = ['economy', 'standard', 'flexible'] as const
export const COOKING_SKILLS = ['beginner', 'confident', 'experienced'] as const
export const COOKING_ENJOYMENT_LEVELS = ['low', 'neutral', 'high'] as const
export const CONSTRAINT_STRENGTHS = ['hard', 'soft'] as const

export type HouseholdStatus = (typeof HOUSEHOLD_STATUSES)[number]
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number]
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number]
export type ApplicationRole = (typeof APPLICATION_ROLES)[number]
export type PrepMode = (typeof PREP_MODES)[number]
export type BudgetBand = (typeof BUDGET_BANDS)[number]
export type CookingSkill = (typeof COOKING_SKILLS)[number]
export type CookingEnjoyment = (typeof COOKING_ENJOYMENT_LEVELS)[number]
export type ConstraintStrength = (typeof CONSTRAINT_STRENGTHS)[number]

export interface Profile {
  id: string
  displayName: string
  timezone: string
  locale: string
  createdAt: string
  updatedAt: string
}

export interface Household {
  id: string
  name: string
  status: HouseholdStatus
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface HouseholdMembership {
  id: string
  householdId: string
  userId: string
  role: HouseholdRole
  status: MembershipStatus
  joinedAt: string
  inactiveAt?: string
  createdAt: string
  updatedAt: string
}

export interface AppUserRole {
  userId: string
  role: ApplicationRole
  grantedBy?: string
  createdAt: string
  updatedAt: string
}

export interface HouseholdSettings {
  householdId: string
  defaultServings: number
  weeknightMaxMinutes: number
  weekendMaxMinutes: number
  preferredPrepDay?: number
  prepMode: PrepMode
  defaultStore?: string
  budgetBand: BudgetBand
  cookingSkill: CookingSkill
  cookingEnjoyment: CookingEnjoyment
  createdAt: string
  updatedAt: string
}

export interface DietaryRequirement {
  id: string
  householdId: string
  appliesToMemberId?: string
  requirement: string
  normalisedRequirement: string
  strength: ConstraintStrength
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Allergy {
  id: string
  householdId: string
  appliesToMemberId?: string
  allergen: string
  normalisedAllergen: string
  notes?: string
  createdAt: string
  updatedAt: string
}
