import { describe, expect, it } from 'vitest'
import {
  correctPutAwayAmount,
  correctPutAwayName,
  groupPutAwaySources,
  selectPutAwayPantry,
  type PutAwaySource,
} from '../../src/domain/shopping/putAway'
import type { PantryItem } from '../../src/domain/pantry/types'

const pantry = (name: string, extra: Partial<PantryItem> = {}): PantryItem => ({
  id: name,
  householdId: 'synthetic-household',
  name,
  category: 'other',
  categorySource: 'automatic',
  storageLocation: 'pantry',
  storageLocationSource: 'automatic',
  classificationVersion: 1,
  quantity: null,
  unit: null,
  available: true,
  isDefault: false,
  updatedAt: '2026-11-08T00:00:00Z',
  ...extra,
})
const source = (name: string, extra: Partial<PutAwaySource> = {}): PutAwaySource => ({
  key: 'p:synthetic',
  token: 'snapshot',
  shoppingItemId: 'synthetic',
  name,
  amounts: [{ quantity: null, unit: null }],
  ...extra,
})

describe('exceptions-only put-away', () => {
  it.each(['tomato paste', 'black pepper', 'ground cumin', 'egg'])(
    'automatically handles an existing %s without requiring another decision',
    (name) => {
      expect(groupPutAwaySources([source(name, { pantryItems: [pantry(name)] })])[0]).toMatchObject(
        { name, pantryName: name, included: true, attention: null, editing: false },
      )
    },
  )
  it.each([
    ['50 g parmesan plus extra to serve', 'parmesan'],
    ['freshly cracked black pepper', 'black pepper'],
    ['salt for pasta water', 'salt'],
    ['pine nuts toasted note 1', 'pine nuts'],
    ['miso use any type of miso I used hikari miso organic white miso', 'miso'],
    ['white sesame seeds optional', 'white sesame seeds'],
  ])('cleans %s without demanding a quantity', (name, expected) => {
    expect(groupPutAwaySources([source(name)])[0]).toMatchObject({
      name: expected,
      quantity: null,
      attention: null,
      included: true,
    })
  })
  it('recovers an explicit amount only from a single untouched captured purchase label', () => {
    const label = '600 g lamb mince or beef mince equivalent'
    expect(groupPutAwaySources([source(label, { allowLabelQuantity: true })])[0]).toMatchObject({
      name: 'lamb mince',
      quantity: 600,
      unit: 'g',
      attention: null,
    })
    for (const extra of [
      { allowLabelQuantity: false },
      { allowLabelQuantity: true, hasConsumedStock: true },
      { key: 'c:legacy', allowLabelQuantity: true },
    ]) {
      expect(groupPutAwaySources([source(label, extra)])[0]?.quantity).toBeNull()
    }
  })
  it('keeps confirmed and remaining amounts authoritative over label amounts', () => {
    expect(
      groupPutAwaySources([
        source('600 g lamb mince', {
          allowLabelQuantity: true,
          amounts: [{ quantity: 400, unit: 'g' }],
          hasConsumedStock: true,
        }),
      ])[0],
    ).toMatchObject({ quantity: 400, unit: 'g' })
  })
  it('repairs a punctuation-flattened name from its matching provenance but never recipe demand', () => {
    const captured = '25g 1 1 2 tbsp unsalted butter melted and cooled'
    const nameEvidence = [
      {
        name: captured,
        purchaseName: captured,
        originalText: '25g / 1 1/2 tbsp unsalted butter, melted and cooled',
      },
    ]
    expect(groupPutAwaySources([source(captured, { nameEvidence })])[0]).toMatchObject({
      name: 'unsalted butter',
      quantity: null,
      attention: null,
    })
    expect(groupPutAwaySources([source('Salted butter', { nameEvidence })])[0]?.name).toBe(
      'salted butter',
    )
  })
  it('preserves unknown extra stock and never rounds an unrepresentable amount to zero', () => {
    expect(
      groupPutAwaySources([
        source('25g butter plus extra to serve', { allowLabelQuantity: true }),
      ])[0],
    ).toMatchObject({ quantity: 25, unit: 'g', quantityUntracked: true })
    expect(
      groupPutAwaySources([source('saffron', { amounts: [{ quantity: 0.001, unit: 'g' }] })])[0],
    ).toMatchObject({ quantity: null, unit: null })
  })
  it('adds exact decimal amounts at persisted precision', () => {
    const rows = groupPutAwaySources([
      source('saffron', { amounts: [{ quantity: 0.1, unit: 'g' }] }),
      source('saffron', { key: 'p:2', amounts: [{ quantity: 0.2, unit: 'g' }] }),
    ])
    expect(rows[0]).toMatchObject({ quantity: 0.3, unit: 'g', attention: null })
    expect(
      groupPutAwaySources([source('rice', { amounts: [{ quantity: 100, unit: 'kg' }] })])[0],
    ).toMatchObject({ attention: 'unit-conflict', included: false })
  })
  it('asks only for actual alternatives, without buying all of them', () => {
    const [review] = groupPutAwaySources([source('currants or raisins or sultanas')])
    expect(review).toMatchObject({ attention: 'ingredient', included: false })
    expect(correctPutAwayName(review!, 'raisins')).toMatchObject({
      name: 'raisins',
      attention: null,
      included: true,
    })
  })
  it('resolves duplicate Pantry candidates by exact user choice, including out-of-stock items', () => {
    const targets = [pantry('Eggs'), pantry('Egg', { available: false })]
    const [review] = groupPutAwaySources([source('egg', { pantryItems: targets })])
    expect(review).toMatchObject({ attention: 'pantry-match', included: false })
    expect(selectPutAwayPantry(review!, targets[1]!)).toMatchObject({
      pantryName: 'Egg',
      attention: null,
      included: true,
    })
  })
  it('does not silently add incompatible units to a recognised Pantry item', () => {
    const [review] = groupPutAwaySources([
      source('rice', {
        pantryItems: [pantry('Rice', { quantity: 2, unit: 'each' })],
        amounts: [{ quantity: 500, unit: 'g' }],
      }),
    ])
    expect(review).toMatchObject({ attention: 'unit-conflict', included: false })
    expect(correctPutAwayAmount(review!, null, null)).toMatchObject({
      quantity: null,
      attention: null,
      included: true,
    })
    expect(correctPutAwayAmount(review!, 2, 'each')).toMatchObject({
      quantity: 2,
      attention: null,
      included: true,
    })
    expect(
      correctPutAwayName(correctPutAwayAmount(review!, 2, 'scoops'), 'New rice'),
    ).toMatchObject({ attention: 'unit-conflict', included: false })
  })
})

it('combines corrected destinations without losing unknown stock or retry provenance', async () => {
  const { combinePutAwayChoices } = await import('../../src/domain/shopping/putAway')
  const choice = {
    name: 'Rice',
    quantity: 600,
    unit: 'g',
    pantryUpdatedAt: 'same',
    sources: [{ key: 'p:1', token: 'one' }],
    category: 'other' as const,
    storageLocation: 'pantry' as const,
  }
  expect(
    combinePutAwayChoices([
      choice,
      { ...choice, quantity: null, sources: [{ key: 'p:2', token: 'two' }] },
    ])[0],
  ).toMatchObject({
    quantity: 600,
    quantityUntracked: true,
    sources: [
      { key: 'p:1', token: 'one' },
      { key: 'p:2', token: 'two' },
    ],
  })
  expect(
    combinePutAwayChoices([choice, { ...choice, quantity: 0.4, unit: 'kg' }])[0]?.quantity,
  ).toBe(1000)
  expect(
    combinePutAwayChoices([
      { ...choice, quantity: 0.1 },
      { ...choice, quantity: 0.2 },
    ])[0]?.quantity,
  ).toBe(0.3)
  expect(() => combinePutAwayChoices([{ ...choice, quantity: 99999 }, choice])).toThrow(/too large/)
  expect(() => combinePutAwayChoices([choice, { ...choice, unit: 'ml' }])).toThrow(
    /different measures/,
  )
  expect(() => combinePutAwayChoices([choice, { ...choice, pantryUpdatedAt: 'newer' }])).toThrow(
    /Pantry changed/,
  )
})
