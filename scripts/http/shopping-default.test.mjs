import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { householdId, localClient, localSupabaseClient, must } from './local-client.mjs'

test('next-week defaults and future custom overrides retain purchases through the real adapter', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null } })
  const db = localClient()
  try {
    const { createSupabaseShoppingRepository } = await server.ssrLoadModule(
      '/src/infrastructure/shopping/supabaseShoppingRepository.ts',
    )
    const { chooseShoppingPeriod } = await server.ssrLoadModule('/src/domain/shopping/period.ts')
    const { addDays } = await server.ssrLoadModule('/src/domain/meal-plans/week.ts')
    const owner = createSupabaseShoppingRepository(localSupabaseClient())
    const member = createSupabaseShoppingRepository(localSupabaseClient(2))
    const unrelated = createSupabaseShoppingRepository(localSupabaseClient(3))
    const before = await must(
      db.from('shopping_list_items').select('*').eq('household_id', householdId).order('id'),
    )
    const contributions = await must(
      db
        .from('shopping_item_contributions')
        .select('*')
        .eq('household_id', householdId)
        .order('id'),
    )
    const purchases = await must(
      db.from('shopping_stock_purchases').select('*').eq('household_id', householdId).order('id'),
    )
    const previousDefault = await owner.loadDefault(householdId)
    const previousView = await owner.loadPeriod(householdId)
    try {
      await owner.saveDefault(householdId, 'nextWeek')
      assert.equal(await member.loadDefault(householdId), 'nextWeek')
      await member.savePeriod(householdId, chooseShoppingPeriod('default'))
      const nextWeek = chooseShoppingPeriod('nextWeek')
      assert.deepEqual((await member.loadPeriod(householdId)).period, nextWeek)
      await member.savePeriod(householdId, nextWeek)
      assert.deepEqual((await member.loadPeriod(householdId)).period, nextWeek)
      const futureCustom = {
        kind: 'custom',
        weekStart: addDays(nextWeek.weekStart, 7),
        from: addDays(nextWeek.weekStart, 9),
        to: addDays(nextWeek.weekStart, 11),
      }
      await member.savePeriod(householdId, futureCustom)
      const reloaded = await owner.loadPeriod(householdId)
      assert.deepEqual(reloaded.period, futureCustom)
      assert.equal(reloaded.choice, 'custom')
      assert.equal(reloaded.notice, null)
      await owner.saveDefault(householdId, 'next3')
      assert.equal(await member.loadDefault(householdId), 'next3')
      assert.deepEqual((await member.loadPeriod(householdId)).period, futureCustom)
      await assert.rejects(member.saveDefault(householdId, 'next5'))
      await assert.rejects(unrelated.loadDefault(householdId))
      await assert.rejects(unrelated.saveDefault(householdId, 'next5'))
      await member.savePeriod(householdId, chooseShoppingPeriod('week'))
      await owner.saveDefault(householdId, 'next5')
      assert.equal((await member.loadPeriod(householdId)).period.kind, 'week')
      await member.savePeriod(householdId, chooseShoppingPeriod('default'))
      const followed = await member.loadPeriod(householdId)
      assert.equal(followed.choice, 'default')
      assert.equal(followed.period.kind, 'next5')
      assert.deepEqual(
        await must(
          db
            .from('shopping_stock_purchases')
            .select('*')
            .eq('household_id', householdId)
            .order('id'),
        ),
        purchases,
      )
      assert.deepEqual(
        await must(
          db.from('shopping_list_items').select('*').eq('household_id', householdId).order('id'),
        ),
        before,
      )
      assert.deepEqual(
        await must(
          db
            .from('shopping_item_contributions')
            .select('*')
            .eq('household_id', householdId)
            .order('id'),
        ),
        contributions,
      )
    } finally {
      await owner.saveDefault(householdId, previousDefault)
      await member.savePeriod(householdId, {
        ...previousView.period,
        kind: previousView.choice ?? previousView.period.kind,
      })
    }
  } finally {
    await server.close()
  }
})
