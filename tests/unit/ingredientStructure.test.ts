import { describe, expect, it } from 'vitest'
import {
  structureIngredient,
  structureExistingIngredient,
} from '../../src/domain/recipes/ingredientStructure'

describe('shared lossless ingredient structure', () => {
  it.each([
    ['oil for frying see note 3', 'oil', null, null, null, 'for frying'],
    ['3 tbsp extra virgin olive oil', 'extra virgin olive oil', '3', 'tbsp', null, null],
    ['2 tbsp olive oil', 'olive oil', '2', 'tbsp', null, null],
    ['1 tbsp brown sugar can be substituted with honey', 'brown sugar', '1', 'tbsp', null, null],
    [
      '80 g Roughly chopped sun dried tomatoes in oil see note 1',
      'sun dried tomatoes in oil',
      '80',
      'g',
      'Roughly chopped',
      null,
    ],
    ['2 handfuls fresh baby spinach', 'fresh baby spinach', '2', 'handful', null, null],
    ['2 tomato finely diced', 'tomato', '2', null, 'finely diced', null],
    ['2 avocados mashed with a fork', 'avocados', '2', null, 'mashed with a fork', null],
    ['1 1/2 cups plain flour', 'plain flour', '1 1/2', 'cup', null, null],
  ])(
    'structures %s without changing the source',
    (line, name, quantity, unit, preparation, purpose) => {
      const parsed = structureIngredient(line!)
      expect(parsed).toMatchObject({
        originalText: line,
        name,
        preparation,
        purpose,
        quantity: { text: quantity, unit },
      })
    },
  )
  it('retains optional alternatives and unresolved note references without choosing them', () => {
    const row = structureIngredient('1 tbsp brown sugar can be substituted with honey (see note 3)')
    expect(row.substitutions).toEqual(['can be substituted with honey'])
    expect(row.noteReferences).toEqual(['see note 3'])
    expect(row.unresolved).toContain('note_body')
    expect(row.canonicalName).toBe('brown sugar')
  })
  it.each([
    'gluten-free flour',
    'unsalted butter',
    'canned diced tomatoes',
    'diced tomatoes',
    'olive oil spray',
    'infused olive oil',
    'sun dried tomatoes in oil',
    'packed brown sugar',
    'sifted plain flour',
  ])('retains meaningful form and dietary distinctions in %s', (name) => {
    expect(structureIngredient(`20 g ${name}`).name).toBe(name)
  })
  it('keeps ranges, fractions and package uncertainty honest', () => {
    expect(structureIngredient('1 ½ cups flour').quantity.value).toBe(1.5)
    expect(structureIngredient('1-2 cups flour').quantity).toMatchObject({
      state: 'range',
      value: 1,
      maximum: 2,
    })
    expect(structureIngredient('2 x 400 g cans tomatoes').quantity.value).toBe(800)
  })
  it('repairs a known v1 mixed fraction without changing its source', () => {
    const input = {
      name: '1/2 cups plain flour',
      quantity: '1',
      unit: null,
      preparation: null,
      originalLineText: '1 1/2 cups plain flour',
      parserVersion: 'recipe-content-v1',
    }
    expect(structureExistingIngredient(input)).toMatchObject({
      name: 'plain flour',
      quantity: { text: '1 1/2', unit: 'cup', value: 1.5 },
      originalText: input.originalLineText,
    })
  })
  it('preserves explicit structured edits rather than replacing them from an older original line', () => {
    const input = {
      name: 'red onion',
      quantity: '3',
      unit: null,
      preparation: 'thinly sliced',
      originalLineText: '2 onions, diced',
      parserVersion: 'manual',
    }
    expect(structureExistingIngredient(input)).toMatchObject({
      name: 'red onion',
      quantity: { value: 3 },
      preparation: 'thinly sliced',
      originalText: input.originalLineText,
    })
  })
})

describe('preparation grammar generalises beyond the reported ingredient names', () => {
  it.each(['kohlrabi', 'radicchio', 'tarragon', 'cavolo nero', 'oyster mushrooms', 'garlic'])(
    'recognises leading and trailing preparation for %s without a product whitelist',
    (product) => {
      for (const preparation of ['sliced', 'crushed', 'diced', 'finely chopped', 'julienned']) {
        expect(structureIngredient(`2 ${preparation} ${product}`)).toMatchObject({
          name: product,
          preparation,
        })
        expect(structureIngredient(`2 ${product}, ${preparation}`)).toMatchObject({
          name: product,
          preparation,
        })
      }
    },
  )
  it.each([
    'garlic powder',
    'jarred garlic paste',
    'dried garlic',
    'extra virgin olive oil',
    'olive oil',
    'diced frozen onion',
    'crushed garlic in a jar',
    'minced beef',
    'sliced bread',
    'crushed tomatoes',
  ])('retains purchased form %s', (product) => {
    expect(structureIngredient(`20 g ${product}`).name).toBe(product)
  })
  it('retains an unfamiliar or ambiguous phrase instead of manufacturing a core identity', () => {
    expect(structureIngredient('20 g garlic or shallots')).toMatchObject({
      name: 'garlic or shallots',
      unresolved: ['alternative_product'],
    })
    expect(structureIngredient('2 specially treated fiddleheads').name).toBe(
      'specially treated fiddleheads',
    )
  })
})

it('recognises parenthesised preparation without losing it', () => {
  expect(structureIngredient('2 kohlrabi (thinly sliced)')).toMatchObject({
    name: 'kohlrabi',
    preparation: 'thinly sliced',
  })
})

describe('explicit metric package quantities', () => {
  it.each([
    ['2 x 400 g cans tomatoes', 800, 'g', 'cans tomatoes'],
    ['3×250ml cartons coconut milk', 750, 'ml', 'cartons coconut milk'],
    ['2 x 0.5 kilograms bags lentils', 1, 'kg', 'bags lentils'],
    ['3 x 0.1 l bottles kefir', 0.3, 'l', 'bottles kefir'],
    ['2 x 125 grams tubs unfamiliar cultured food', 250, 'g', 'tubs unfamiliar cultured food'],
  ])('parses %s without losing package evidence', (line, value, unit, name) => {
    const result = structureIngredient(line)
    expect(result).toMatchObject({
      originalText: line,
      name,
      quantity: { value, maximum: value, unit, state: 'known' },
    })
    expect(result.quantity.package?.count).toBe(Number(line[0]))
    expect(result.quantity.package?.originalText).toBe(result.quantity.text)
  })
  it.each([
    '2 x 400 g cans tomatoes, drained',
    '2 x 400-500 g cans tomatoes',
    '2 x large cans tomatoes',
    '2 (400 g) cans tomatoes',
    'about 2 x 400 g cans tomatoes',
    '0 x 400 g cans tomatoes',
    '2 x 0 g cans tomatoes',
    '2 x 400 g cans tomatoes (240 g drained)',
  ])('leaves ambiguous %s unresolved', (line) => {
    expect(structureIngredient(line)).toMatchObject({
      originalText: line,
      name: line,
      quantity: { state: 'unknown', value: null },
      unresolved: ['package_quantity'],
    })
  })
  it('does not reuse a legacy partial count for unresolved packages', () => {
    expect(
      structureExistingIngredient({
        name: 'x large cans tomatoes',
        quantity: '2',
        unit: null,
        preparation: null,
        originalLineText: '2 x large cans tomatoes',
        parserVersion: 'recipe-content-v1',
      }).quantity.value,
    ).toBeNull()
  })
})
