// Opt-in v2 adoption check against the expanded, isolated synthetic local schema.
import { test, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/infrastructure/database/generated/database.types'
import { createSupabaseShoppingRepository } from '../../src/infrastructure/shopping/supabaseShoppingRepository'
import { createSupabasePantryRepository } from '../../src/infrastructure/pantry/supabasePantryRepository'
import type { PantryItemInput } from '../../src/domain/pantry/types'
import { groupPutAwaySources } from '../../src/domain/shopping/putAway'

test.skipIf(process.env.COOKSMITH_RUN_DATABASE_COMPATIBILITY !== '1')(
  'v2 application buys and puts away legacy plural stock with idempotent retries',
  async () => {
    const config = JSON.parse(
      execFileSync('node_modules/.bin/supabase', ['status', '--output', 'json'], {
        encoding: 'utf8',
      }),
    )
    expect(new URL(config.API_URL).hostname).toBe('127.0.0.1')
    const encode = (x: unknown) => Buffer.from(JSON.stringify(x)).toString('base64url')
    const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`
    const token = `${payload}.${createHmac('sha256', config.JWT_SECRET).update(payload).digest('base64url')}`
    const client = createClient<Database>(config.API_URL, config.ANON_KEY, {
      accessToken: async () => token,
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const db = client.schema('cooksmith'),
      household = '20000000-0000-4000-8000-000000000001'
    async function must(q: PromiseLike<{ data: unknown; error: unknown }>) {
      const r = await q
      expect(r.error).toBeNull()
      return r.data as Record<string, unknown>
    }
    const name = `compatibility ${crypto.randomUUID().replace(/[^a-f]/g, '')} mushrooms`
    const stock = await must(
      db
        .from('household_pantry_items')
        .insert({
          household_id: household,
          name,
          quantity: 200,
          unit: 'g',
          category: 'produce',
          available: true,
        })
        .select()
        .single(),
    )
    const recipe = await must(
      db
        .from('household_recipes')
        .insert({
          household_id: household,
          name: `Synthetic ${name}`,
          ingredients: `100 g ${name}`,
        })
        .select()
        .single(),
    )
    const meal = await must(
      db
        .from('planned_meals')
        .insert({
          household_id: household,
          recipe_id: String(recipe.id),
          title: `Synthetic ${name}`,
          meal_date: '2026-11-17',
          meal_type: 'dinner',
        })
        .select()
        .single(),
    )
    await must(
      db.rpc('reconcile_planned_meal_shopping_v2', {
        target_household_id: household,
        target_planned_meal_id: String(meal.id),
        ingredient_inputs: [
          {
            name: name.replace(/s$/, ''),
            quantity: 100,
            unit: 'g',
            category: 'produce',
            sourceQuantities: [
              {
                name,
                purchaseName: name,
                purchaseQuantity: 100,
                purchaseUnit: 'g',
                ingredientIdentityVersion: 2,
                quantity: '100',
                unit: 'g',
                originalText: `100 g ${name}`,
              },
            ],
          },
        ],
      }),
    )
    const contribution = await must(
      db
        .from('shopping_item_contributions')
        .select('*')
        .eq('planned_meal_id', String(meal.id))
        .single(),
    )
    const item = await must(
      db
        .from('shopping_list_items')
        .select('*')
        .eq('id', String(contribution.shopping_item_id))
        .single(),
    )
    const repository = createSupabaseShoppingRepository(client),
      operation = crypto.randomUUID()
    await repository.buy!(
      household,
      operation,
      String(item.display_name),
      [
        {
          id: String(item.id),
          householdId: household,
          name: String(item.display_name),
          quantity: Number(item.quantity),
          unit: 'g',
          category: 'produce',
          completed: Boolean(item.completed),
          position: Number(item.position),
          updatedAt: String(item.updated_at),
        },
      ],
      [{ quantity: 100, unit: 'g' }],
    )
    const sources = (await repository.listPutAway!(household)).filter(
      (s) => s.key === `p:${operation}`,
    )
    const review = groupPutAwaySources(sources)[0]!
    expect(
      review.pantryName,
      `Server product ${String(item.display_name)} must still match the old client's Pantry product`,
    ).toBe(stock.name)
    // Same action used by the existing UI: an unmatched label is offered as a new Pantry item.
    const receiptOperation = crypto.randomUUID()
    const choices = [
      {
        name: review.pantryName ?? review.name,
        quantity: review.quantity,
        unit: review.unit,
        pantryUpdatedAt: review.pantryUpdatedAt,
        category: 'produce' as const,
        storageLocation: 'fridge' as const,
        sources: review.sources.map((s) => ({ key: s.key, token: s.token })),
      },
    ]
    await expect(repository.putAway!(household, receiptOperation, choices)).resolves.toBeDefined()
    await expect(repository.putAway!(household, receiptOperation, choices)).resolves.toBeDefined()
    const after = await must(
      db.from('household_pantry_items').select('quantity').eq('id', String(stock.id)).single(),
    )
    expect(Number(after.quantity)).toBe(300)
    const pantry = createSupabasePantryRepository(client)
    const input: PantryItemInput = {
      name: name.replace('mushrooms', 'quiche'),
      quantity: 1,
      unit: 'each',
      category: 'other',
      categorySource: 'explicit',
      storageLocation: 'fridge',
      storageLocationSource: 'explicit',
      classificationVersion: null,
      available: true,
    }
    const created = await pantry.create(household, input)
    expect(created.name).toBe(input.name)
    const updated = await pantry.update(created.id, { ...input, quantity: 2 })
    expect(updated.quantity).toBe(2)
    await expect(pantry.create(household, { ...input, name: `${input.name}s` })).rejects.toThrow(
      'already exists',
    )
  },
  30000,
)
