import type { MeasurementSystem } from '../../domain/measurements/purchaseMeasures'
import type { PostgrestError } from '@supabase/supabase-js'

import { buildPlanAdditions } from '../../domain/shopping/planGeneration'
import type { ShoppingRepository } from '../../application/shopping/shoppingRepository'
import type { ShoppingItem, ShoppingSourceQuantity } from '../../domain/shopping/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

type ShoppingRow = {
  measurement_system?: MeasurementSystem
  combine_with_plan?: boolean
  id: string
  household_id: string
  display_name: string
  quantity: number | string | null
  unit: string | null
  category: ShoppingItem['category']
  completed: boolean
  position: number
  updated_at: string
  manual: boolean
  shopping_item_contributions?: { source_quantities: ShoppingSourceQuantity[] }[]
}

function mapRow(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.display_name,
    measurementSystem: row.measurement_system,
    combineWithPlan: row.combine_with_plan,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    category: row.category,
    completed: row.completed,
    position: row.position,
    updatedAt: row.updated_at,
    manual: row.manual,
    sourceQuantities:
      row.shopping_item_contributions?.flatMap((contribution) => contribution.source_quantities) ??
      [],
  }
}

function shoppingError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '23505': 'That item is already on your shopping list.',
    '23514': 'Check the item name, quantity and unit.',
    '42501': 'You do not have permission to change this shopping list.',
  }
  throw new Error(
    messages[error.code] ?? 'Cooksmith could not update the shopping list. Try again.',
  )
}

export function createSupabaseShoppingRepository(
  client: CooksmithSupabaseClient,
): ShoppingRepository {
  const database = client.schema('cooksmith')
  const selection =
    'combine_with_plan, measurement_system, id, household_id, display_name, quantity, unit, category, completed, position, updated_at, manual, shopping_item_contributions(source_quantities)'

  return {
    async list(householdId) {
      const result = await database
        .from('shopping_list_items')
        .select(selection)
        .eq('household_id', householdId)
        .order('completed')
        .order('position')
        .order('display_name')
      shoppingError(result.error)
      return ((result.data ?? []) as unknown as ShoppingRow[]).map(mapRow)
    },

    async create(householdId, input) {
      const result = await database
        .from('shopping_list_items')
        .insert({
          household_id: householdId,
          display_name: input.name,
          measurement_system: input.measurementSystem ?? 'unknown',
          combine_with_plan: input.combineWithPlan ?? false,
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
        } as never)
        .select(selection)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async createFromPlan(householdId, plannedMealId, inputs) {
      const result = await (
        database as never as {
          rpc: (
            name: string,
            params: Record<string, unknown>,
          ) => Promise<{ error: PostgrestError | null }>
        }
      ).rpc('reconcile_planned_meal_shopping', {
        target_household_id: householdId,
        target_planned_meal_id: plannedMealId,
        ingredient_inputs: inputs,
      })
      shoppingError(result.error)
    },

    async setCompletedMany(householdId, itemIds, completed) {
      const result = await database.rpc(
        'set_shopping_purchase_completed' as never,
        {
          target_household_id: householdId,
          item_ids: itemIds,
          target_completed: completed,
        } as never,
      )
      shoppingError(result.error)
    },
    async removeMany(householdId, itemIds) {
      const result = await database.rpc(
        'remove_shopping_purchase' as never,
        { target_household_id: householdId, item_ids: itemIds } as never,
      )
      shoppingError(result.error)
    },
    async updatePurchase(householdId, inputs) {
      const result = await database.rpc(
        'update_shopping_purchase' as never,
        { target_household_id: householdId, item_inputs: inputs } as never,
      )
      shoppingError(result.error)
    },
    async refreshRecipe(householdId, recipe) {
      const result = await database
        .from('planned_meals')
        .select('id')
        .eq('household_id', householdId)
        .eq(
          recipe.scope === 'household' || !recipe.scope ? 'recipe_id' : 'imported_recipe_id',
          recipe.id,
        )
      shoppingError(result.error)
      const inputs = buildPlanAdditions(
        [
          {
            recipeState: {
              kind: 'active',
              recipe: { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt },
            },
          },
        ],
        [recipe],
        [],
      ).additions
      for (const meal of result.data ?? [])
        await this.createFromPlan?.(householdId, meal.id, inputs)
    },
    async update(itemId, input) {
      const current = await database
        .from('shopping_list_items')
        .select('household_id')
        .eq('id', itemId)
        .single()
      shoppingError(current.error)
      if (!current.data) throw new Error('Cooksmith could not find that shopping item.')
      await this.updatePurchase?.(current.data.household_id, [{ ...input, id: itemId }])
      const result = await database
        .from('shopping_list_items')
        .select(selection)
        .eq('id', itemId)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not save that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async setCompleted(itemId, completed) {
      const result = await database
        .from('shopping_list_items')
        .update({ completed } as never)
        .eq('id', itemId)
        .select(selection)
        .single()
      shoppingError(result.error)
      if (!result.data) throw new Error('Cooksmith could not update that shopping item.')
      return mapRow(result.data as unknown as ShoppingRow)
    },

    async remove(itemId) {
      const result = await database.from('shopping_list_items').delete().eq('id', itemId)
      shoppingError(result.error)
    },
  }
}
