import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const url = process.env.COOKSMITH_LOCAL_REST_URL
const secret = process.env.COOKSMITH_LOCAL_JWT_SECRET
// Explicit opt-in: browser journeys never point at a hosted household.
test.skip(!url || !secret, 'Requires the synthetic local PostgREST database')
test('known groceries need one batch confirmation, dinner one Done and one Undo, with cross-page stock', async ({
  page,
}, info) => {
  if (!url || !secret) return
  expect(['127.0.0.1', 'localhost']).toContain(new URL(url).hostname)
  const household = '20000000-0000-4000-8000-000000000002'
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: '10000000-0000-4000-8000-000000000003', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`
  const token = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
  const client = createClient(url, token, {
    accessToken: async () => token,
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(String(input).replace('/rest/v1', ''), init) },
  }).schema('cooksmith')
  async function must(query: PromiseLike<{ data: unknown; error: unknown }>) {
    const result = await query
    expect(result.error).toBeNull()
    return result.data as Record<string, unknown>
  }
  const suffix = crypto.randomUUID().slice(0, 8),
    name = `rice ${suffix}`,
    title = `Rice dinner ${suffix}`
  const today = new Date().toISOString().slice(0, 10)
  await must(
    client.from('planned_meals').delete().eq('household_id', household).eq('meal_date', today),
  )
  const recipe = await must(
    client
      .from('household_recipes')
      .insert({
        household_id: household,
        name: title,
        ingredients: `600 g ${name}`,
        description: 'Cook synthetic rice.',
      })
      .select('*')
      .single(),
  )
  const stock = await must(
    client
      .from('household_pantry_items')
      .insert({
        household_id: household,
        name,
        quantity: 200,
        unit: 'g',
        available: true,
        category: 'grains_rice_and_pasta',
      })
      .select('*')
      .single(),
  )
  const meal = await must(
    client
      .from('planned_meals')
      .insert({
        household_id: household,
        title,
        meal_date: today,
        meal_type: 'dinner',
        recipe_id: recipe.id,
      })
      .select('*')
      .single(),
  )
  await must(
    client.from('shopping_list_items').insert({
      household_id: household,
      display_name: name,
      quantity: 400,
      unit: 'g',
      category: 'pantry',
    }),
  )
  await page.addInitScript(
    (config) => {
      ;(window as unknown as { localStock: typeof config }).localStock = config
    },
    { url, token, householdId: household },
  )
  await page.setViewportSize({ width: 320, height: 780 })
  await page.goto('/tests/e2e/fixtures/quantity-loop.html')
  const period = page.getByRole('combobox', { name: 'Buy for' })
  await expect(period).toHaveValue('default')
  await period.selectOption('week')
  await expect(period).toBeEnabled()
  expect(
    (
      await must(
        client
          .from('household_shopping_periods')
          .select('shopping_period_kind')
          .eq('household_id', household)
          .single(),
      )
    ).shopping_period_kind,
  ).toBe('week')
  await period.selectOption('default')
  await expect(period).toBeEnabled()
  expect(
    (
      await must(
        client
          .from('household_shopping_periods')
          .select('shopping_period_kind')
          .eq('household_id', household)
          .single(),
      )
    ).shopping_period_kind,
  ).toBe('default')
  const buy = page.getByRole('button', { name: `Mark as done: ${name}` })
  await expect(buy).toBeVisible()
  await buy.click()
  await page.getByRole('button', { name: 'Put shopping away' }).click()
  const dialog = page.getByRole('dialog', { name: 'Put shopping away' })
  await expect(dialog.getByRole('checkbox')).toHaveCount(1)
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  await expect(dialog.getByRole('checkbox', { name: `Include ${name}` })).toBeChecked()
  await expect(dialog).toContainText('400 g')
  await expect(dialog.getByText(/Some of this purchase has already been used/)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Put selected items away' }).click()
  await expect(dialog).toBeHidden()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(600)
  await page.getByRole('link', { name: 'Plan', exact: true }).first().click()
  const done = page.getByRole('button', { name: `Mark done ${title}` })
  await expect(done).toBeVisible()
  await done.click()
  await expect(page.getByRole('button', { name: `Undo done ${title}` })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(0)
  await page.getByRole('button', { name: `Undo done ${title}` }).click()
  await expect(done).toBeVisible()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(600)
  expect(
    (await must(client.from('planned_meals').select('completed_at').eq('id', meal.id).single()))
      .completed_at,
  ).toBeNull()
  // An unknown recipe amount adds no mandatory review or fabricated deduction.
  await must(
    client
      .from('household_recipes')
      .update({ ingredients: `${name} to taste` })
      .eq('id', recipe.id),
  )
  await done.click()
  await expect(page.getByRole('button', { name: `Undo done ${title}` })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Amounts untracked' })).toBeVisible()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(600)
  await page.getByRole('button', { name: `Undo done ${title}` }).click()
  await expect(done).toBeVisible()
  const more = page.getByLabel(`More actions for ${title}`)
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: `Edit planned dinner ${title}` })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const doneBox = await done.boundingBox()
  expect(doneBox!.width).toBeGreaterThanOrEqual(44)
  expect(doneBox!.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({ path: info.outputPath('quantity-loop-320px.png'), fullPage: true })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    (await page.getByRole('button', { name: title, exact: true }).boundingBox())!.width,
  ).toBeGreaterThanOrEqual(180)
  await page.screenshot({
    path: info.outputPath('quantity-loop-320px-200-percent.png'),
    fullPage: true,
  })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  await info.attach('action-counts', {
    body: JSON.stringify({
      fixture: 'known 200g Pantry + 400g purchase, 600g dinner',
      buy: 1,
      openPutAway: 1,
      batchConfirm: 1,
      requiredTextEntries: 0,
      done: 1,
      undo: 1,
      exceptions: 0,
    }),
    contentType: 'application/json',
  })
  // Correct what remains after cooking, not the original purchase total.
  await must(
    client
      .from('household_recipes')
      .update({ ingredients: `600 g ${name}` })
      .eq('id', recipe.id),
  )
  await must(
    client
      .from('household_pantry_items')
      .update({ quantity: 200, available: true })
      .eq('id', stock.id),
  )
  await must(
    client
      .from('shopping_list_items')
      .delete()
      .eq('household_id', household)
      .eq('display_name', name),
  )
  await must(
    client.from('shopping_list_items').insert({
      household_id: household,
      display_name: name,
      quantity: 500,
      unit: 'g',
      category: 'pantry',
    }),
  )
  await page.getByRole('button', { name: 'Shopping', exact: true }).first().click()
  await page.getByRole('button', { name: `Mark as done: ${name}` }).click()
  await page.getByRole('link', { name: 'Plan', exact: true }).first().click()
  await done.click()
  await expect(page.getByRole('button', { name: `Undo done ${title}` })).toBeVisible()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(0)
  await page.getByRole('button', { name: 'Shopping', exact: true }).first().click()
  await page.getByRole('button', { name: 'Put shopping away' }).click()
  await expect(dialog).toContainText('100 g')
  await expect(dialog.getByText(/Some of this purchase has already been used/)).toBeVisible()
  await dialog.getByRole('button', { name: `Change ${name}` }).click()
  const remaining = dialog.getByRole('spinbutton', {
    name: `Amount remaining to put away for ${name}`,
  })
  await expect(remaining).toHaveValue('100')
  await expect(dialog.getByLabel(/Amount bought/)).toHaveCount(0)
  // The household counts 80g still in the bag; only that correction is transferred.
  await remaining.fill('80')
  await expect(dialog).toContainText('Only the remaining amounts shown are added to Pantry.')
  await dialog.getByRole('button', { name: 'Put selected items away' }).click()
  await expect(dialog).toBeHidden()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(80)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Put shopping away', exact: true })).toHaveCount(0)
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(80)
  await page.getByRole('link', { name: 'Plan', exact: true }).first().click()
  await page.getByRole('button', { name: `Undo done ${title}` }).click()
  const undoReview = page.getByRole('dialog')
  await expect(undoReview).toBeVisible()
  await undoReview.getByRole('button', { name: /Undo/ }).click()
  await expect(done).toBeVisible()
  expect(
    (
      await must(
        client.from('household_pantry_items').select('quantity').eq('id', stock.id).single(),
      )
    ).quantity,
  ).toBe(680)
})
