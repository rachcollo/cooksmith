import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createServer } from 'vite'
import { householdId, localClient, localSupabaseClient, must } from './local-client.mjs'

test('ordinary member refreshes public recipe amounts through the real repository without losing purchases', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null } })
  try {
    const { createSupabaseShoppingRepository } = await server.ssrLoadModule(
      '/src/infrastructure/shopping/supabaseShoppingRepository.ts',
    )
    const db = localClient(),
      member = localClient(2)
    const shopping = createSupabaseShoppingRepository(localSupabaseClient(2))
    const recipe = await must(
      db
        .from('imported_recipes')
        .insert({
          owner_id: '10000000-0000-4000-8000-000000000001',
          visibility: 'public',
          name: 'Synthetic public refresh',
          source_url: `https://example.invalid/refresh/${randomUUID()}`,
          ingredients: '55 g caster sugar see note 3',
          description: 'Mix.',
          ingredient_rows: [
            {
              id: 'legacy-sugar',
              ingredient_name: 'caster sugar see note 3',
              quantity_text: '55',
              unit: 'g',
              preparation: null,
              original_line_text: '55 g caster sugar see note 3',
              parser_version: 'recipe-content-v1',
              derivation_status: 'derived',
              position: 0,
            },
            {
              id: 'tomato',
              ingredient_name: 'tomato',
              quantity_text: '2',
              unit: null,
              preparation: null,
              original_line_text: '2 tomato',
              parser_version: 'recipe-content-v1',
              derivation_status: 'derived',
              position: 1,
            },
          ],
        })
        .select()
        .single(),
    )
    const meal = await must(
      member
        .from('planned_meals')
        .insert({
          household_id: householdId,
          meal_date: '2026-10-06',
          meal_type: 'dinner',
          title: 'Synthetic public refresh',
          imported_recipe_id: recipe.id,
        })
        .select()
        .single(),
    )
    await shopping.createFromPlan(householdId, meal.id, [
      {
        name: 'caster sugar see note 3',
        quantity: 55,
        unit: 'g',
        category: 'pantry',
        sourceQuantities: [{ name: 'caster sugar see note 3', quantity: '55', unit: 'g' }],
      },
      {
        name: 'tomato',
        quantity: 2,
        unit: null,
        category: 'produce',
        sourceQuantities: [{ name: 'tomato', quantity: '2', unit: null }],
      },
    ])
    const snapshot = () =>
      must(
        member
          .from('shopping_item_contributions')
          .select('id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities')
          .eq('planned_meal_id', meal.id)
          .order('id'),
      )
    const expected = await snapshot()
    const sugar = expected.find((row) => row.unit === 'g')
    const tomato = expected.find((row) => row.unit === null)
    await shopping.updatePurchase(householdId, [
      {
        id: tomato.shopping_item_id,
        name: 'My tomato choice',
        quantity: 7,
        unit: null,
        category: 'produce',
      },
    ])
    await must(
      member
        .from('shopping_list_items')
        .update({ completed: true })
        .eq('id', sugar.shopping_item_id),
    )
    const manual = await must(
      member
        .from('shopping_list_items')
        .insert({
          household_id: householdId,
          display_name: `Synthetic manual ${randomUUID()}`,
          quantity: 3,
          unit: 'pack',
          category: 'other',
          completed: true,
        })
        .select()
        .single(),
    )
    const overrides = await must(
      member.from('shopping_list_items').select('*').eq('id', tomato.shopping_item_id),
    )
    const result = await shopping.refreshStructure(householdId)
    assert.ok(result.refreshed >= 1)
    const fresh = await snapshot()
    const item = await must(
      member
        .from('shopping_list_items')
        .select('*')
        .eq('id', fresh.find((row) => row.unit === 'g').shopping_item_id)
        .single(),
    )
    assert.equal(item.display_name, 'caster sugar')
    assert.equal(Number(fresh.find((row) => row.unit === 'g').quantity), 55)
    assert.equal(item.completed, true)
    assert.deepEqual(
      await must(member.from('shopping_list_items').select('*').eq('id', manual.id).single()),
      manual,
    )
    assert.deepEqual(
      await must(member.from('shopping_list_items').select('*').eq('id', tomato.shopping_item_id)),
      overrides,
    )
    assert.deepEqual(await shopping.refreshStructure(householdId), { refreshed: 0, skipped: 0 })
    assert.deepEqual(await snapshot(), fresh)
    assert.deepEqual(
      await must(member.from('imported_recipes').select('*').eq('id', recipe.id).single()),
      recipe,
    )
    assert.deepEqual(
      await must(
        db
          .from('imported_recipes')
          .update({ name: 'Forbidden owner edit' })
          .eq('id', recipe.id)
          .select('id'),
      ),
      [],
    )
    const publicDelete = await member.from('imported_recipes').delete().eq('id', recipe.id)
    assert.equal(publicDelete.error?.code, '42501')
    const stale = await member.rpc('refresh_shopping_ingredient_structure', {
      target_household_id: householdId,
      batches: [
        {
          mealId: meal.id,
          recipeId: recipe.id,
          recipeSource: 'imported',
          recipeVersion: '2000-01-01T00:00:00Z',
          expected: fresh,
          inputs: [],
        },
      ],
    })
    assert.equal(stale.status, 409)
    assert.equal(stale.error?.message, 'Recipe changed.')
    assert.deepEqual(await snapshot(), fresh)
    assert.deepEqual(
      await must(
        member
          .from('imported_recipes')
          .update({ name: 'Forbidden edit' })
          .eq('id', recipe.id)
          .select('id'),
      ),
      [],
    )
    assert.equal(
      (
        await must(
          member.from('imported_recipes').select('name,updated_at').eq('id', recipe.id).single(),
        )
      ).updated_at,
      recipe.updated_at,
    )
  } finally {
    await server.close()
  }
})

test('Shopping lock capability does not change private recipe editing ownership', async () => {
  const owner = localClient(),
    member = localClient(2)
  const recipe = await must(
    owner
      .from('imported_recipes')
      .insert({
        owner_id: '10000000-0000-4000-8000-000000000001',
        visibility: 'private',
        name: 'Synthetic personal import',
        source_url: `https://example.invalid/private/${randomUUID()}`,
      })
      .select()
      .single(),
  )
  assert.deepEqual(
    await must(
      member
        .from('imported_recipes')
        .update({ name: 'Forbidden edit' })
        .eq('id', recipe.id)
        .select('id'),
    ),
    [],
  )
  assert.deepEqual(
    await must(owner.from('imported_recipes').select('*').eq('id', recipe.id).single()),
    recipe,
  )
  const edited = await must(
    owner
      .from('imported_recipes')
      .update({ name: 'My customised personal recipe' })
      .eq('id', recipe.id)
      .select()
      .single(),
  )
  assert.equal(edited.name, 'My customised personal recipe')
  assert.equal(edited.visibility, 'private')
  assert.equal(edited.owner_id, recipe.owner_id)
})
