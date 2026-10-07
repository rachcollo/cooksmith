import assert from 'node:assert/strict'
import { test } from 'node:test'
import { householdId, localClient, must } from './local-client.mjs'
const db = localClient()
const other = localClient(2)
const foreign = localClient(3)
const command = (client, meal, action, lines, operationId = crypto.randomUUID()) =>
  client.rpc('meal_stock_command', {
    p_household_id: householdId,
    p_operation_id: operationId,
    p_plan_id: meal.id,
    p_action: action,
    p_expected_revision: meal.completion_revision,
    p_expected_updated_at: meal.updated_at,
    p_lines: lines,
  })
const getMeal = (id) => must(db.from('planned_meals').select('*').eq('id', id).single())
const getStock = (id) => must(db.from('household_pantry_items').select('*').eq('id', id).single())
const getPurchase = (id) =>
  must(db.from('shopping_stock_purchases').select('*').eq('id', id).single())
const undoReview = (meal) =>
  must(
    db.rpc('meal_stock_undo_review', {
      p_household_id: householdId,
      p_plan_id: meal.id,
      p_revision: meal.completion_revision,
    }),
  )
async function setup(name, onHand = 200, bought = 500) {
  const stock = await must(
    db
      .from('household_pantry_items')
      .insert({
        household_id: householdId,
        name,
        category: 'other',
        quantity: onHand,
        unit: 'g',
        available: true,
      })
      .select('*')
      .single(),
  )
  const item = await must(
    db
      .from('shopping_list_items')
      .insert({
        household_id: householdId,
        display_name: name,
        quantity: bought,
        unit: 'g',
        category: 'other',
      })
      .select('*')
      .single(),
  )
  const purchaseId = crypto.randomUUID()
  const buy = {
    p_household_id: householdId,
    p_operation_id: purchaseId,
    p_name: name,
    p_items: [{ id: item.id, updatedAt: item.updated_at }],
    p_amounts: [{ quantity: bought, unit: 'g' }],
  }
  await must(db.rpc('record_shopping_stock_purchase', buy))
  await must(db.rpc('record_shopping_stock_purchase', buy))
  const meal = await must(
    db
      .from('planned_meals')
      .insert({
        household_id: householdId,
        title: name,
        meal_date: '2026-10-09',
        meal_type: 'dinner',
      })
      .select('*')
      .single(),
  )
  return { stock, item, purchaseId, meal }
}
async function receive(purchaseId, stock, amount, op = crypto.randomUUID()) {
  const sources = await must(db.rpc('measured_shopping_sources', { p_household_id: householdId }))
  const source = sources.find((s) => s.id === purchaseId)
  const args = {
    p_household_id: householdId,
    p_operation_id: op,
    p_choices: [
      {
        name: stock.name,
        quantity: amount,
        unit: 'g',
        pantryUpdatedAt: stock.updated_at,
        category: 'other',
        storageLocation: 'pantry',
        sources: [{ key: `p:${purchaseId}`, token: source.snapshot_token }],
      },
    ],
  }
  await must(db.rpc('receive_measured_shopping', args))
  await must(db.rpc('receive_measured_shopping', args))
  return args
}
test('cook before put-away, then Undo after transfer restores exactly recorded food once', async () => {
  const f = await setup('HTTP lifecycle rice')
  const lines = [
    {
      kind: 'pantry',
      pantryItemId: f.stock.id,
      name: f.stock.name,
      unit: 'g',
      amount: 200,
      updatedAt: f.stock.updated_at,
    },
    {
      kind: 'purchase',
      purchaseId: f.purchaseId,
      purchaseIndex: 0,
      revision: 0,
      name: f.stock.name,
      unit: 'g',
      amount: 400,
    },
  ]
  const operationId = crypto.randomUUID()
  await must(command(db, f.meal, 'done', lines, operationId))
  await must(command(db, f.meal, 'done', lines, operationId))
  assert.equal((await getStock(f.stock.id)).quantity, 0)
  assert.deepEqual((await getPurchase(f.purchaseId)).consumed_amounts, { 0: 400 })
  const remaining = (
    await must(db.rpc('measured_shopping_sources', { p_household_id: householdId }))
  ).find((p) => p.id === f.purchaseId)
  assert.equal(remaining.amounts[0].quantity, 100)
  const unbuy = await db.rpc('unbuy_shopping_stock', {
    p_household_id: householdId,
    p_item_ids: [f.item.id],
  })
  assert.equal(unbuy.status, 412)
  await receive(f.purchaseId, await getStock(f.stock.id), 100)
  assert.equal((await getStock(f.stock.id)).quantity, 100)
  const meal = await getMeal(f.meal.id),
    review = await undoReview(meal)
  assert.equal(review.changed, true)
  assert.equal(review.lines.length, 1)
  assert.equal(review.lines[0].amount, 600)
  const undoId = crypto.randomUUID()
  await must(command(db, meal, 'undo', review.lines, undoId))
  await must(command(db, meal, 'undo', review.lines, undoId))
  assert.equal((await getStock(f.stock.id)).quantity, 700)
  const snapshot = await must(db.rpc('shopping_stock_snapshot', { p_household_id: householdId }))
  assert.equal(snapshot.purchases.find((p) => p.id === f.purchaseId).received_at !== null, true)
  assert.equal(snapshot.pantry.find((p) => p.id === f.stock.id).quantity, 700)
  assert.equal(
    (await foreign.rpc('shopping_stock_snapshot', { p_household_id: householdId })).status,
    403,
  )
})
test('concurrent Done commands cannot double consume; Undo before put-away restores pending stock', async () => {
  const f = await setup('HTTP concurrent rice', 0, 500)
  const lines = [
    {
      kind: 'purchase',
      purchaseId: f.purchaseId,
      purchaseIndex: 0,
      revision: 0,
      name: f.stock.name,
      unit: 'g',
      amount: 500,
    },
  ]
  const results = await Promise.all([
    command(db, f.meal, 'done', lines),
    command(other, f.meal, 'done', lines),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.equal((await getPurchase(f.purchaseId)).consumed_amounts['0'], 500)
  const meal = await getMeal(f.meal.id),
    review = await undoReview(meal)
  assert.equal(review.changed, false)
  await must(command(db, meal, 'undo', review.lines))
  assert.equal((await getPurchase(f.purchaseId)).consumed_amounts['0'], 0)
  await receive(f.purchaseId, await getStock(f.stock.id), 500)
  assert.equal((await getStock(f.stock.id)).quantity, 500)
})
test('stale put-away rejects atomically after cooking; fully consumed receipt transfers zero', async () => {
  const f = await setup('HTTP consumed rice', 0, 500)
  const source = (
    await must(db.rpc('measured_shopping_sources', { p_household_id: householdId }))
  ).find((p) => p.id === f.purchaseId)
  await must(
    command(db, f.meal, 'done', [
      {
        kind: 'purchase',
        purchaseId: f.purchaseId,
        purchaseIndex: 0,
        revision: 0,
        name: f.stock.name,
        unit: 'g',
        amount: 500,
      },
    ]),
  )
  const stale = await db.rpc('receive_measured_shopping', {
    p_household_id: householdId,
    p_operation_id: crypto.randomUUID(),
    p_choices: [
      {
        name: f.stock.name,
        quantity: 500,
        unit: 'g',
        pantryUpdatedAt: f.stock.updated_at,
        category: 'other',
        storageLocation: 'pantry',
        sources: [{ key: `p:${f.purchaseId}`, token: source.snapshot_token }],
      },
    ],
  })
  assert.equal(stale.status, 409)
  assert.equal((await getStock(f.stock.id)).quantity, 0)
  await receive(f.purchaseId, await getStock(f.stock.id), 0)
  assert.equal((await getStock(f.stock.id)).quantity, 0)
  const meal = await getMeal(f.meal.id)
  await must(command(db, meal, 'undo', (await undoReview(meal)).lines))
  assert.equal((await getStock(f.stock.id)).quantity, 500)
})

test('unknown Pantry receives a measured lower bound without inventing the previous amount', async () => {
  const f = await setup('HTTP unknown rice', null, 500)
  await receive(f.purchaseId, f.stock, 500)
  let stock = await getStock(f.stock.id)
  assert.equal(stock.quantity, 500)
  assert.equal(stock.quantity_untracked, true)
  await must(
    command(db, f.meal, 'done', [
      {
        kind: 'pantry',
        pantryItemId: stock.id,
        name: stock.name,
        updatedAt: stock.updated_at,
        amount: 500,
        unit: 'g',
      },
      { kind: 'untracked', name: 'Additional rice amount unknown' },
    ]),
  )
  stock = await getStock(stock.id)
  assert.equal(stock.quantity, 0)
  assert.equal(stock.available, true)
  assert.equal(stock.quantity_untracked, true)
  const meal = await getMeal(f.meal.id),
    review = await undoReview(meal)
  const tampered = await command(
    db,
    meal,
    'undo',
    review.lines.map((l) => ({ ...l, amount: 999 })),
  )
  assert.equal(tampered.status, 409)
  assert.equal((await getStock(stock.id)).quantity, 0)
  await must(command(db, meal, 'undo', review.lines))
  assert.equal((await getStock(stock.id)).quantity, 500)
  await must(
    db
      .from('household_pantry_items')
      .update({ quantity: 500, quantity_untracked: false })
      .eq('id', stock.id),
  )
  assert.equal((await getStock(stock.id)).quantity_untracked, false)
})

test('generated 600g + 400g demand allocates 500g once, then buy, put-away, Done and Undo preserve coverage', async () => {
  const { createServer } = await import('vite')
  const { localSupabaseClient } = await import('./local-client.mjs')
  const server = await createServer({ server: { middlewareMode: true, watch: null } })
  const meals = []
  try {
    const { createSupabaseShoppingRepository } = await server.ssrLoadModule(
      '/src/infrastructure/shopping/supabaseShoppingRepository.ts',
    )
    const shopping = createSupabaseShoppingRepository(localSupabaseClient())
    const name = `http generated rice ${crypto.randomUUID().slice(0, 8)}`
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const stock = await must(
      db
        .from('household_pantry_items')
        .insert({
          household_id: householdId,
          name,
          quantity: 500,
          unit: 'g',
          available: true,
          category: 'other',
        })
        .select('*')
        .single(),
    )
    for (const [index, quantity] of [600, 400].entries()) {
      const meal = await must(
        db
          .from('planned_meals')
          .insert({
            household_id: householdId,
            title: `Allocation ${index}`,
            meal_date: new Date(monday.getTime() + (3 + index) * 86400000)
              .toISOString()
              .slice(0, 10),
            meal_type: 'dinner',
          })
          .select('*')
          .single(),
      )
      meals.push(meal)
      await shopping.createFromPlan(householdId, meal.id, [
        {
          name,
          quantity,
          unit: 'g',
          category: 'pantry',
          sourceQuantities: [{ name, quantity, unit: 'g' }],
        },
      ])
    }
    let view = await shopping.loadPeriod(householdId),
      row = view.items.find((i) => i.name === name)
    assert.equal(row.quantity, 500)
    // A later-period override must not reallocate stock already assigned to earlier meals.
    const week = {
      kind: 'week',
      weekStart: view.period.weekStart,
      from: view.period.weekStart,
      to: view.period.to,
    }
    await shopping.saveDefault(householdId, 'week')
    await shopping.savePeriod(householdId, { ...week, kind: 'default' })
    assert.equal((await shopping.loadPeriod(householdId)).choice, 'default')
    await shopping.savePeriod(householdId, {
      ...week,
      kind: 'custom',
      from: meals[1].meal_date,
      to: meals[1].meal_date,
    })
    await shopping.saveDefault(householdId, 'next3')
    const custom = await shopping.loadPeriod(householdId)
    assert.equal(custom.choice, 'custom')
    assert.equal(custom.items.find((item) => item.name === name).quantity, 400)
    await shopping.saveDefault(householdId, 'week')
    await shopping.savePeriod(householdId, { ...week, kind: 'default' })
    view = await shopping.loadPeriod(householdId)
    row = view.items.find((item) => item.name === name)
    assert.equal(row.quantity, 500)
    const buyId = crypto.randomUUID()
    await shopping.buy(householdId, buyId, name, [row], [{ quantity: 500, unit: 'g' }])
    view = await shopping.loadPeriod(householdId)
    row = view.items.find((i) => i.name === name)
    assert.equal(row.quantity, 500)
    assert.equal(row.completed, true)
    await receive(buyId, stock, 500)
    const current = await getStock(stock.id)
    await must(
      command(db, meals[0], 'done', [
        {
          kind: 'pantry',
          pantryItemId: stock.id,
          name,
          unit: 'g',
          updatedAt: current.updated_at,
          amount: 600,
        },
      ]),
    )
    assert.equal((await getStock(stock.id)).quantity, 400)
    view = await shopping.loadPeriod(householdId)
    assert.equal(view.items.filter((i) => i.name === name && !i.completed).length, 0)
    const completed = await getMeal(meals[0].id)
    await must(command(db, completed, 'undo', (await undoReview(completed)).lines))
    assert.equal((await getStock(stock.id)).quantity, 1000)
    view = await shopping.loadPeriod(householdId)
    assert.equal(view.items.filter((i) => i.name === name && !i.completed).length, 0)
    // A recipe refresh preserves procurement provenance; legacy put-away cannot replay it.
    const legacy = await must(
      db.rpc('shopping_put_away_sources', { target_household_id: householdId }),
    )
    assert.equal(legacy.filter((s) => s.name === name).length, 0)
  } finally {
    for (const meal of meals) await must(db.from('planned_meals').delete().eq('id', meal.id))
    await server.close()
  }
})

test('freezer Done shares completion revisions and old consume route rejects new operations', async () => {
  const freezerId = crypto.randomUUID(),
    planId = crypto.randomUUID()
  const freezer = (action, payload, plan = null) =>
    db.rpc('freezer_command', {
      p_household_id: householdId,
      p_operation_id: crypto.randomUUID(),
      p_action: action,
      p_freezer_id: freezerId,
      p_plan_id: plan,
      p_payload: payload,
    })
  await must(
    freezer('create', { name: 'HTTP freezer portions', portions: 3, frozenOn: '2026-10-07' }),
  )
  await must(freezer('reserve', { portions: 2, mealDate: '2026-10-10' }, planId))
  const old = await freezer('consume', {}, planId)
  assert.equal(old.status, 409)
  const stock = await must(db.from('freezer_meals').select('*').eq('id', freezerId).single())
  const meal = await getMeal(planId),
    lines = [
      {
        kind: 'freezer',
        freezerId,
        revision: stock.revision,
        name: stock.name,
        unit: 'portion',
        amount: 2,
      },
    ]
  const results = await Promise.all([
    command(db, meal, 'done', lines),
    command(other, meal, 'done', lines),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.equal(
    (await must(db.from('freezer_meals').select('*').eq('id', freezerId).single())).portions,
    1,
  )
  const done = await getMeal(planId),
    review = await undoReview(done)
  assert.equal(review.changed, false)
  await must(command(db, done, 'undo', review.lines))
  assert.equal(
    (await must(db.from('freezer_meals').select('*').eq('id', freezerId).single())).portions,
    3,
  )
})

test('a stale recipe snapshot rejects measured completion without changing stock', async () => {
  const f = await setup('HTTP recipe version rice', 1000, 0)
  const recipe = await must(
    db
      .from('household_recipes')
      .insert({ household_id: householdId, name: 'HTTP recipe version', ingredients: '600 g rice' })
      .select('*')
      .single(),
  )
  const meal = await must(
    db
      .from('planned_meals')
      .update({ recipe_id: recipe.id })
      .eq('id', f.meal.id)
      .select('*')
      .single(),
  )
  const lines = [
    {
      kind: 'pantry',
      pantryItemId: f.stock.id,
      name: f.stock.name,
      unit: 'g',
      updatedAt: f.stock.updated_at,
      amount: 600,
    },
    { kind: 'recipe', recipeId: recipe.id, updatedAt: recipe.updated_at },
  ]
  await must(db.from('household_recipes').update({ ingredients: '400 g rice' }).eq('id', recipe.id))
  const rejected = await command(db, meal, 'done', lines)
  assert.equal(rejected.status, 409)
  assert.equal((await getStock(f.stock.id)).quantity, 1000)
  assert.equal((await getMeal(meal.id)).completed_at, null)
})
