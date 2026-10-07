import { expect, it } from 'vitest'
import { groupPutAwaySources } from '../../src/domain/shopping/putAway'
import { structureIngredient } from '../../src/domain/recipes/ingredientStructure'

it.each([
  ['freshly minced garlic', 'garlic'],
  ['green capsicum capsicum', 'green capsicum'],
  ['handfuls fresh baby spinach', 'fresh baby spinach'],
  ['2 handfuls fresh baby spinach', 'fresh baby spinach'],
  ['finely chopped kale', 'kale'],
  ['jarred garlic paste', 'jarred garlic paste'],
  ['minced beef', 'minced beef'],
  ['garlic powder', 'garlic powder'],
  ['red capsicum', 'red capsicum'],
])(
  'recognises legacy %s through the shared parser without erasing original text',
  (name, expected) => {
    const source = { key: name, token: 'snapshot', shoppingItemId: 'item', name }
    const [row] = groupPutAwaySources([source])
    expect(row?.name).toBe(expected)
    expect(row?.included).toBe(true)
    expect(row?.editing).toBe(false)
    expect(row?.sources[0]?.name).toBe(name)
    expect(structureIngredient(name).originalText).toBe(name)
  },
)
it('retains an unknown amount while separating a leftover measure word', () => {
  expect(structureIngredient('handfuls fresh baby spinach').quantity).toMatchObject({
    value: null,
    state: 'unknown',
    unit: 'handful',
  })
})

it('retains a known measured floor when extra bought stock is unmeasured', () => {
  const [row] = groupPutAwaySources([
    {
      key: 'p:rice',
      token: 'v',
      shoppingItemId: 'rice',
      name: 'Rice',
      amounts: [
        { quantity: 500, unit: 'g' },
        { quantity: null, unit: 'g' },
      ],
    },
  ])
  expect(row).toMatchObject({
    quantity: 500,
    unit: 'g',
    quantityUntracked: true,
    included: true,
    editing: false,
  })
})
