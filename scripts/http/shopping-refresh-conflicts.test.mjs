import assert from 'node:assert/strict'
import { test } from 'node:test'
import { householdId, localClient, must } from './local-client.mjs'

test('all stale Shopping snapshots return HTTP 409 without modifying purchases; fresh retry succeeds', async () => {
  const db = localClient(),
    member = localClient(2)
  const recipe = await must(
    db
      .from('household_recipes')
      .insert({
        household_id: householdId,
        name: 'Synthetic refresh conflict',
        ingredients: '55 g brown sugar see note 3',
      })
      .select()
      .single(),
  )
  const meal = await must(
    db
      .from('planned_meals')
      .insert({
        household_id: householdId,
        meal_date: '2026-10-06',
        meal_type: 'dinner',
        title: 'Synthetic refresh conflict',
        recipe_id: recipe.id,
      })
      .select()
      .single(),
  )
  const old = [
    {
      name: 'brown sugar see note 3',
      quantity: 55,
      unit: 'g',
      category: 'pantry',
      sourceQuantities: [{ name: 'brown sugar see note 3', quantity: '55', unit: 'g' }],
    },
  ]
  await must(
    db.rpc('reconcile_planned_meal_shopping', {
      target_household_id: householdId,
      target_planned_meal_id: meal.id,
      ingredient_inputs: old,
    }),
  )
  const snapshot = () =>
    must(
      db
        .from('shopping_item_contributions')
        .select('id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities')
        .eq('planned_meal_id', meal.id)
        .order('id'),
    )
  const expected = await snapshot()
  const itemId = expected[0].shopping_item_id
  await must(member.from('shopping_list_items').update({ completed: true }).eq('id', itemId))
  const batch = {
    mealId: meal.id,
    recipeId: recipe.id,
    recipeSource: 'household',
    recipeVersion: recipe.updated_at,
    expected,
    inputs: [
      {
        ...old[0],
        name: 'brown sugar',
        sourceQuantities: [
          {
            ...old[0].sourceQuantities[0],
            purchaseName: 'brown sugar',
            legacyPurchaseNames: ['brown sugar see note 3'],
          },
        ],
      },
    ],
  }
  const state = async () => ({
    contributions: await snapshot(),
    item: await must(db.from('shopping_list_items').select('*').eq('id', itemId).single()),
  })
  const before = await state()
  for (const [patch, message] of [
    [{ recipeSource: 'imported' }, 'Meal changed.'],
    [{ recipeVersion: '2000-01-01T00:00:00Z' }, 'Recipe changed.'],
    [{ expected: [] }, 'Shopping contributions changed.'],
  ]) {
    const start = Date.now()
    const result = await db.rpc('refresh_shopping_ingredient_structure', {
      target_household_id: householdId,
      batches: [{ ...batch, ...patch }],
    })
    assert.equal(result.status, 409, message)
    assert.equal(result.error?.code, 'PT409', message)
    assert.equal(result.error?.message, message)
    assert.ok(Date.now() - start < 4000)
    assert.deepEqual(await state(), before)
  }
  // A valid first batch must roll back when a later stale snapshot fails.
  const atomic = await db.rpc('refresh_shopping_ingredient_structure', {
    target_household_id: householdId,
    batches: [batch, { ...batch, recipeVersion: '2000-01-01T00:00:00Z' }],
  })
  assert.equal(atomic.status, 409)
  assert.deepEqual(await state(), before)
  await must(
    db.rpc('refresh_shopping_ingredient_structure', {
      target_household_id: householdId,
      batches: [batch],
    }),
  )
  const fresh = await snapshot()
  const item = await must(
    db.from('shopping_list_items').select('*').eq('id', fresh[0].shopping_item_id).single(),
  )
  assert.equal(item.display_name, 'brown sugar')
  assert.equal(item.completed, true)
  assert.equal(Number(item.quantity), 55)
  const denied = await localClient(3).rpc('refresh_shopping_ingredient_structure', {
    target_household_id: householdId,
    batches: [batch],
  })
  assert.equal(denied.error?.code, '42501')
})
