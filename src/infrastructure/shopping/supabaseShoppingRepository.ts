import { allocateHouseholdStock } from '../../domain/shopping/stockAllocation'
import { mapPantryRow, type PantryRow } from '../pantry/supabasePantryRepository'
import { createSupabasePantryRepository } from '../pantry/supabasePantryRepository'
import { PutAwayReviewError } from '../../domain/shopping/putAway'
import { z } from 'zod'
import {
  shoppingPeriodView,
  resolveShoppingPeriod,
  validShoppingPeriod,
  type ShoppingPeriod,
  type PeriodShoppingItem,
} from '../../domain/shopping/period'
import {
  refreshedIngredientInputs,
  sameIngredientSources,
} from '../../domain/shopping/structureRefresh'
import { createSupabaseRecipeRepository } from '../recipes/supabaseRecipeRepository'
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
  plan_override?: boolean
  shopping_item_contributions?: {
    planned_meal_id: string
    quantity: number | string | null
    unit: string | null
    source_quantities: ShoppingSourceQuantity[]
  }[]
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
    PT409: 'Shopping changed. Close and reopen the review to check the latest purchases.',
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
    'plan_override, combine_with_plan, measurement_system, id, household_id, display_name, quantity, unit, category, completed, position, updated_at, manual, shopping_item_contributions(planned_meal_id, quantity, unit, source_quantities)'

  async function loadPeriod(householdId: string) {
    const snapshot = await database.rpc('shopping_stock_snapshot', { p_household_id: householdId })
    shoppingError(snapshot.error)
    const state = snapshot.data as unknown as {
      items: ShoppingRow[]
      settings: {
        shopping_period_kind: string
        shopping_period_week: string
        shopping_period_from: string
        shopping_period_to: string
      } | null
      meals: { id: string; meal_date: string; meal_type: string; completed_at: string | null }[]
      pantry: PantryRow[]
      purchases: {
        name: string
        item_ids: string[]
        received_at: string | null
        amounts: { quantity: number | null; unit: string | null }[]
        consumed_amounts: Record<string, number>
      }[]
    }
    const data = state.settings
    const saved: ShoppingPeriod | null = data?.shopping_period_week
      ? {
          kind: data.shopping_period_kind as ShoppingPeriod['kind'],
          weekStart: data.shopping_period_week,
          from: data.shopping_period_from ?? '',
          to: data.shopping_period_to ?? '',
        }
      : null
    const rows: PeriodShoppingItem[] = state.items.map((row) => ({
      ...mapRow(row),
      planOverride: row.plan_override,
      contributions: (row.shopping_item_contributions ?? []).map((c) => ({
        plannedMealId: c.planned_meal_id,
        quantity: c.quantity === null ? null : Number(c.quantity),
        unit: c.unit,
        sourceQuantities: c.source_quantities,
      })),
    }))
    for (const row of rows) {
      if (!row.completed) continue
      const purchases = state.purchases.filter((p) => p.item_ids.includes(row.id))
      const amounts = purchases.filter((p) => p.item_ids[0] === row.id).flatMap((p) => p.amounts)
      if (purchases.length && amounts.length && new Set(amounts.map((a) => a.unit)).size === 1) {
        row.boughtQuantity = amounts.every((a) => a.quantity !== null)
          ? amounts.reduce((sum, a) => sum + a.quantity!, 0)
          : null
        row.boughtUnit = amounts[0]!.unit
      } else if (purchases.length && !amounts.length) {
        row.boughtQuantity = 0
        row.boughtUnit = purchases[0]!.amounts[0]?.unit ?? null
      }
    }
    const meals = state.meals.map((m) => ({
      id: m.id,
      mealDate: m.meal_date,
      mealType: m.meal_type,
      completed: Boolean(m.completed_at),
    }))
    const pending = state.purchases.flatMap((p) =>
      p.amounts.map((a, i) => ({
        name: p.name,
        quantity: a.quantity === null ? null : a.quantity - (p.consumed_amounts[String(i)] ?? 0),
        unit: a.unit,
        putAway: Boolean(p.received_at),
      })),
    )
    return shoppingPeriodView(
      allocateHouseholdStock(
        rows,
        meals.filter((m) => m.mealDate >= resolveShoppingPeriod(saved).period.weekStart),
        state.pantry.map(mapPantryRow),
        pending,
      ),
      saved,
      meals,
    )
  }

  return {
    async buy(householdId, operationId, name, items, amounts) {
      const result = await database.rpc('record_shopping_stock_purchase', {
        p_household_id: householdId,
        p_operation_id: operationId,
        p_name: name,
        p_items: items.map((item) => ({ id: item.id, updatedAt: item.updatedAt })),
        p_amounts: amounts.map((amount) => ({ ...amount })),
      })
      shoppingError(result.error)
    },
    async listPutAway(householdId) {
      const [result, pantryItems, purchases] = await Promise.all([
        database.rpc('shopping_put_away_sources', { target_household_id: householdId }),
        createSupabasePantryRepository(client).list(householdId),
        database
          .from('shopping_stock_purchases')
          .select('*')
          .eq('household_id', householdId)
          .is('voided_at', null),
      ])
      shoppingError(result.error)
      shoppingError(purchases.error)
      const pending = (purchases.data ?? []).filter((purchase) => !purchase.received_at)
      if (pending.length) {
        const tokens = await database.rpc('measured_shopping_sources', {
          p_household_id: householdId,
        })
        shoppingError(tokens.error)
        return (tokens.data ?? []).map((purchase) => {
          const amounts = z
            .array(z.object({ quantity: z.number().nullable(), unit: z.string().nullable() }))
            .parse(purchase.amounts)
          // Original amounts are immutable; compare with the RPC's current remainder,
          // not the earlier read's mutable consumption, to explain this review snapshot.
          const original = z
            .array(z.object({ quantity: z.number().nullable() }))
            .parse(pending.find((item) => item.id === purchase.id)?.amounts ?? [])
          return {
            key: `p:${purchase.id}`,
            token: purchase.snapshot_token,
            name: purchase.name,
            shoppingItemId: purchase.item_ids[0]!,
            pantryItems,
            amounts,
            hasConsumedStock: amounts.some((amount, index) => {
              const bought = original[index]?.quantity
              return amount.quantity !== null && bought != null && amount.quantity < bought
            }),
          }
        })
      }
      const captured = new Set((purchases.data ?? []).flatMap((purchase) => purchase.source_keys))
      return (result.data ?? [])
        .filter((row) => !captured.has(row.source_key))
        .map((row) => ({
          pantryItems,
          key: row.source_key,
          token: row.snapshot_token,
          shoppingItemId: row.shopping_item_id,
          name: row.name,
        }))
    },
    async putAway(householdId, operationId, choices) {
      const measured = choices.every((choice) =>
        choice.sources.every((source) => source.key.startsWith('p:')),
      )
      const result = measured
        ? await database.rpc('receive_measured_shopping', {
            p_household_id: householdId,
            p_operation_id: operationId,
            p_choices: choices.map((choice) => ({ ...choice })),
          })
        : await database.rpc('put_shopping_away', {
            target_household_id: householdId,
            operation_id: operationId,
            reviewed_items: choices.map((choice) => ({ ...choice })),
          })
      if (result.error?.code === 'PT409')
        throw new PutAwayReviewError(
          'Shopping changed. Close and reopen the review to check the latest purchases. Nothing was put away.',
        )
      if (result.error?.code === '23514')
        throw new PutAwayReviewError(
          'Check item names. If several Pantry items match, use the exact Pantry name or untick that item. Nothing was put away.',
        )
      shoppingError(result.error)
      return z
        .object({
          appliedSources: z.number().int().nonnegative(),
          alreadyAppliedSources: z.number().int().nonnegative(),
          pantryItems: z.number().int().nonnegative(),
        })
        .parse(result.data)
    },
    loadPeriod,
    async savePeriod(householdId, period) {
      if (!validShoppingPeriod(period))
        throw new Error('Choose a valid range within the active week.')
      const result = await database
        .from('household_shopping_periods')
        .upsert({
          household_id: householdId,
          shopping_period_kind: period.kind,
          shopping_period_week: period.weekStart,
          shopping_period_from: period.from,
          shopping_period_to: period.to,
        })
        .eq('household_id', householdId)
        .select('household_id')
        .single()
      shoppingError(result.error)
    },
    async list(householdId) {
      return (await loadPeriod(householdId)).items
    },

    async refreshStructure(householdId) {
      const [contributions, meals, recipes] = await Promise.all([
        database
          .from('shopping_item_contributions')
          .select('id, shopping_item_id, planned_meal_id, quantity, unit, source_quantities')
          .eq('household_id', householdId),
        database
          .from('planned_meals')
          .select('id, recipe_id, imported_recipe_id')
          .eq('household_id', householdId),
        createSupabaseRecipeRepository(client).list(householdId),
      ])
      shoppingError(contributions.error)
      shoppingError(meals.error)
      const batches = []
      let skipped = 0
      for (const meal of meals.data ?? []) {
        const existing = (contributions.data ?? []).filter((row) => row.planned_meal_id === meal.id)
        if (!existing.length) continue
        const recipe = recipes.find(
          (candidate) =>
            candidate.id === (meal.recipe_id ?? meal.imported_recipe_id) &&
            (meal.recipe_id
              ? !candidate.scope || candidate.scope === 'household'
              : candidate.scope !== 'household'),
        )
        const inputs =
          recipe && !recipe.archivedAt
            ? refreshedIngredientInputs(
                recipe,
                existing.flatMap(
                  (row) => row.source_quantities as unknown as ShoppingSourceQuantity[],
                ),
              )
            : null
        if (
          inputs &&
          sameIngredientSources(
            existing.flatMap((row) => row.source_quantities as unknown as ShoppingSourceQuantity[]),
            inputs.flatMap((input) => input.sourceQuantities ?? []),
          )
        )
          continue
        if (!inputs || batches.length >= 100) {
          skipped++
          continue
        }
        batches.push({
          mealId: meal.id,
          recipeId: recipe!.id,
          recipeSource: meal.recipe_id ? 'household' : 'imported',
          recipeVersion: recipe!.updatedAt,
          expected: existing,
          inputs,
        })
      }
      if (batches.length) {
        const result = await database.rpc(
          'refresh_shopping_ingredient_structure' as never,
          { target_household_id: householdId, batches } as never,
        )
        shoppingError(result.error)
      }
      return { refreshed: batches.length, skipped }
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
      if (!completed) {
        const result = await database.rpc('unbuy_shopping_stock', {
          p_household_id: householdId,
          p_item_ids: itemIds,
        })
        shoppingError(result.error)
        return
      }
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
