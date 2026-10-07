import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { householdId, localClient, localSupabaseClient, must } from './local-client.mjs'

test('household defaults and current-period overrides remain separate through the real adapter', async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null } })
  const db = localClient()
  try {
    const { createSupabaseShoppingRepository } = await server.ssrLoadModule(
      '/src/infrastructure/shopping/supabaseShoppingRepository.ts',
    )
    const { chooseShoppingPeriod } = await server.ssrLoadModule('/src/domain/shopping/period.ts')
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
    const previousDefault = await owner.loadDefault(householdId)
    const previousView = await owner.loadPeriod(householdId)
    try {
      await owner.saveDefault(householdId, 'next3')
      assert.equal(await member.loadDefault(householdId), 'next3')
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
