import assert from 'node:assert/strict'
import { test } from 'node:test'
import { householdId, localClient, must } from './local-client.mjs'

test('stale freezer edit returns HTTP 409 and preserves the newer member edit', async () => {
  const db = localClient(),
    member = localClient(2),
    id = crypto.randomUUID()
  const payload = { name: 'Synthetic conflict test', portions: 2, frozenOn: '2026-10-06' }
  const command = (client, action, body, operationId = crypto.randomUUID()) =>
    client.rpc('freezer_command', {
      p_household_id: householdId,
      p_operation_id: operationId,
      p_action: action,
      p_freezer_id: id,
      p_payload: body,
    })
  await must(command(db, 'create', payload))
  await must(
    command(member, 'edit', { ...payload, name: 'Other member edit', portions: 1, revision: 0 }),
  )
  const before = await must(db.from('freezer_meals').select('*').eq('id', id).single())
  const rejectedOperation = crypto.randomUUID()
  const start = Date.now()
  const rejected = await command(db, 'edit', { ...payload, revision: 0 }, rejectedOperation)
  assert.equal(rejected.status, 409)
  assert.equal(rejected.error?.code, 'PT409')
  assert.equal(rejected.error?.message, 'Stock changed. Refresh before editing.')
  assert.ok(Date.now() - start < 4000)
  assert.deepEqual(await must(db.from('freezer_meals').select('*').eq('id', id).single()), before)
  assert.equal(
    (await must(db.from('freezer_meal_events').select('*').eq('id', rejectedOperation))).length,
    0,
  )
  await must(
    command(db, 'edit', {
      ...payload,
      name: 'Reviewed latest stock',
      portions: before.portions,
      revision: before.revision,
    }),
  )
  const after = await must(db.from('freezer_meals').select('*').eq('id', id).single())
  assert.equal(after.name, 'Reviewed latest stock')
  assert.equal(after.portions, 1)
  assert.equal(after.revision, before.revision + 1)
})
