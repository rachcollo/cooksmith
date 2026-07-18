import type { PostgrestError } from '@supabase/supabase-js'
import type { PlannedMealRepository } from '../../application/meal-plans/plannedMealRepository'
import { recipeStateForLink } from '../../domain/meal-plans/recipeLinks'
import type { LinkedRecipeSummary, MealType, PlannedMeal } from '../../domain/meal-plans/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type PlannedMealRow = {
  id: string
  household_id: string
  meal_date: string
  meal_type: MealType
  title: string
  notes: string | null
  recipe_id: string | null
  household_recipes: { id: string; name: string | null; archived_at: string | null } | null
  created_at: string
  updated_at: string
}

type LegacyPlannedMealRow = Omit<PlannedMealRow, 'recipe_id' | 'household_recipes'>

const selection =
  'id, household_id, meal_date, meal_type, title, notes, recipe_id, created_at, updated_at, household_recipes(id, name, archived_at)'
const legacySelection = 'id, household_id, meal_date, meal_type, title, notes, created_at, updated_at'

function mapRecipe(row: PlannedMealRow): LinkedRecipeSummary | null {
  if (!row.household_recipes) return null
  return {
    id: row.household_recipes.id,
    name: row.household_recipes.name,
    archivedAt: row.household_recipes.archived_at,
  }
}

function mapRow(row: PlannedMealRow): PlannedMeal {
  const linkedRecipe = mapRecipe(row)
  return {
    id: row.id,
    householdId: row.household_id,
    mealDate: row.meal_date,
    mealType: row.meal_type,
    title: row.title,
    notes: row.notes,
    recipeId: row.recipe_id,
    linkedRecipe,
    recipeState: recipeStateForLink(row.recipe_id, linkedRecipe),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLegacyRow(row: LegacyPlannedMealRow): PlannedMeal {
  return mapRow({ ...row, recipe_id: null, household_recipes: null })
}

function isMissingRecipeLinkSchema(error: PostgrestError | null): boolean {
  if (!error) return false
  const haystack = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    error.code === '42703' ||
    error.code === 'PGRST200' ||
    error.code === 'PGRST204' ||
    haystack.includes('recipe_id') ||
    haystack.includes('household_recipes')
  )
}

function mealPlanError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23503': 'Choose a household you belong to before saving a meal.',
    '23514': 'Check the meal title, date, meal type and recipe link.',
    '42501': 'You do not have permission to change this meal plan.',
  }
  throw new Error(messages[error.code] ?? 'Cooksmith could not update the meal plan. Try again.')
}

export function createSupabasePlannedMealRepository(
  client: CooksmithSupabaseClient,
): PlannedMealRepository {
  const database = client.schema('cooksmith')
  return {
    async listWeek(householdId, weekStart, weekEnd) {
      const result = await database
        .from('planned_meals')
        .select(selection)
        .eq('household_id', householdId)
        .gte('meal_date', weekStart)
        .lte('meal_date', weekEnd)
        .order('meal_date')
        .order('meal_type')
        .order('created_at')

      if (isMissingRecipeLinkSchema(result.error)) {
        const legacyResult = await database
          .from('planned_meals')
          .select(legacySelection)
          .eq('household_id', householdId)
          .gte('meal_date', weekStart)
          .lte('meal_date', weekEnd)
          .order('meal_date')
          .order('meal_type')
          .order('created_at')
        mealPlanError(legacyResult.error)
        return ((legacyResult.data ?? []) as unknown as LegacyPlannedMealRow[]).map(mapLegacyRow)
      }

      mealPlanError(result.error)
      return ((result.data ?? []) as unknown as PlannedMealRow[]).map(mapRow)
    },
    async create(householdId, input) {
      const insert = {
        household_id: householdId,
        meal_date: input.mealDate,
        meal_type: input.mealType,
        title: input.title,
        notes: input.notes,
        recipe_id: input.recipeId,
      }
      const result = await database.from('planned_meals').insert(insert as never).select(selection).single()

      if (isMissingRecipeLinkSchema(result.error) && !input.recipeId) {
        const legacyResult = await database
          .from('planned_meals')
          .insert({
            household_id: householdId,
            meal_date: input.mealDate,
            meal_type: input.mealType,
            title: input.title,
            notes: input.notes,
          } as never)
          .select(legacySelection)
          .single()
        mealPlanError(legacyResult.error)
        if (!legacyResult.data) throw new Error('Cooksmith could not save that planned meal.')
        return mapLegacyRow(legacyResult.data as unknown as LegacyPlannedMealRow)
      }

      mealPlanError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save that planned meal.')
      return mapRow(result.data as unknown as PlannedMealRow)
    },
    async update(mealId, input) {
      const update = {
        meal_date: input.mealDate,
        meal_type: input.mealType,
        title: input.title,
        notes: input.notes,
        recipe_id: input.recipeId,
      }
      const result = await database
        .from('planned_meals')
        .update(update as never)
        .eq('id', mealId)
        .select(selection)
        .single()

      if (isMissingRecipeLinkSchema(result.error) && !input.recipeId) {
        const legacyResult = await database
          .from('planned_meals')
          .update({
            meal_date: input.mealDate,
            meal_type: input.mealType,
            title: input.title,
            notes: input.notes,
          } as never)
          .eq('id', mealId)
          .select(legacySelection)
          .single()
        mealPlanError(legacyResult.error)
        if (!legacyResult.data) throw new Error('Cooksmith could not save that planned meal.')
        return mapLegacyRow(legacyResult.data as unknown as LegacyPlannedMealRow)
      }

      mealPlanError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save that planned meal.')
      return mapRow(result.data as unknown as PlannedMealRow)
    },
    async remove(mealId) {
      const result = await database.from('planned_meals').delete().eq('id', mealId)
      mealPlanError(result.error)
    },
  }
}
