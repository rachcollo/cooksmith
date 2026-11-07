import { describe, expect, it } from 'vitest'
import {
  structureIngredient as structureIngredientV1,
  structureExistingIngredient as structureExistingIngredientV1,
} from '../../src/domain/recipes/ingredientStructureV1'
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

describe('source-backed put-away interpretation', () => {
  it.each([
    ['600 g of lamb mince or substitute beef', 'lamb mince', 600, 'g', null],
    ['600g lamb mince or beef mince equivalent', 'lamb mince', 600, 'g', null],
    ['120ml cream or substitute coconut cream', 'cream', 120, 'ml', null],
    ['30 g parmesan plus extra to serve', 'parmesan', 30, 'g', null],
    ['1 tsp freshly cracked black pepper', 'black pepper', 1, 'tsp', 'freshly cracked'],
    ['2 tsp salt for pasta water', 'salt', 2, 'tsp', null],
    ['40g pine nuts toasted (note 1)', 'pine nuts', 40, 'g', 'toasted'],
    ['20g sesame seeds, toasted (note 2)', 'sesame seeds', 20, 'g', 'toasted'],
    ['3 sheets phyllo pastry (note 3)', 'phyllo pastry', 3, 'sheet', null],
    ['3 sheets filo pastry note 3', 'filo pastry', 3, 'sheet', null],
    ['2 tbsp miso (use any type, I used white)', 'miso', 2, 'tbsp', null],
    ['2 tbsp tahini - I used hulled', 'tahini', 2, 'tbsp', null],
    ['10 g tarragon, optional', 'tarragon', 10, 'g', null],
  ])('separates quantity and explicit annotation in %s', (line, name, value, unit, preparation) => {
    expect(structureIngredient(line)).toMatchObject({
      originalText: line,
      name,
      quantity: { value, unit },
      preparation,
    })
  })

  it.each([
    [
      '25g / 1 1/2 tbsp unsalted butter, melted and cooled',
      'unsalted butter',
      25,
      'g',
      1.5,
      'tbsp',
    ],
    [
      '1 1/2 tbsp / 25g unsalted butter, melted and cooled',
      'unsalted butter',
      25,
      'g',
      1.5,
      'tbsp',
    ],
    ['250ml / 1 cup oat milk', 'oat milk', 250, 'ml', 1, 'cup'],
    ['2 cups / 300 grams plain flour', 'plain flour', 300, 'g', 2, 'cup'],
  ])(
    'uses only the explicit metric amount in %s',
    (line, name, value, unit, alternateValue, alternateUnit) => {
      const result = structureIngredient(line)
      expect(result).toMatchObject({
        originalText: line,
        name,
        quantity: {
          value,
          maximum: value,
          unit,
          state: 'known',
          alternateMeasures: [{ value: alternateValue, unit: alternateUnit }],
        },
      })
      expect(result.quantity.alternateMeasures).toHaveLength(1)
      expect(result.unresolved).toEqual([])
      if (name === 'unsalted butter') expect(result.preparation).toBe('melted and cooled')
    },
  )

  it('retains source evidence for annotations instead of inventing preferences', () => {
    expect(structureIngredient('600 g lamb mince or substitute beef').substitutions).toEqual([
      'or substitute beef',
    ])
    expect(structureIngredient('600g lamb mince or beef mince equivalent').substitutions).toEqual([
      'or beef mince equivalent',
    ])
    expect(structureIngredient('30 g parmesan plus extra to serve').purpose).toBe(
      'plus extra to serve',
    )
    expect(structureIngredient('2 tbsp miso (use any type, I used white)').notes).toEqual([
      'use any type, I used white',
    ])
    expect(structureIngredient('10 g tarragon (optional)').optional).toBe(true)
    expect(structureIngredient('40 g pine nuts toasted (note 1)').noteReferences).toEqual([
      'note 1',
    ])
  })

  it.each([
    'currants or raisins or sultanas',
    'lamb mince or beef mince',
    'almond flour or plain flour',
  ])('leaves equal alternatives unresolved: %s', (name) => {
    expect(structureIngredient(`100 g ${name}`)).toMatchObject({
      name,
      unresolved: ['alternative_product'],
    })
  })

  it.each([
    'cracked wheat',
    'cracked rye',
    'toasted sesame oil',
    'toasted pine nuts',
    'roasted salted almonds',
    'fresh black pepper',
    'white miso paste',
    'gluten-free phyllo pastry',
    'low-fat Greek yoghurt',
    'melted cheese slices',
  ])('preserves meaningful forms in %s', (name) => {
    expect(structureIngredient(`20 g ${name}`).name).toBe(name)
  })

  it.each(['25g / 30g butter', '1 cup / 2 cups flour', '25g / 1/0 tbsp butter'])(
    'does not choose an uncertain amount in %s',
    (line) => {
      expect(structureIngredient(line)).toMatchObject({
        quantity: { state: 'unknown', value: null },
        unresolved: expect.arrayContaining(['alternative_quantity']),
      })
    },
  )

  it('does not invent a quantity or translate pastry names into synonyms', () => {
    expect(structureIngredient('phyllo pastry (note 3)')).toMatchObject({
      name: 'phyllo pastry',
      quantity: { value: null, state: 'unknown' },
    })
    expect(structureIngredient('sheets phyllo pastry note 3')).toMatchObject({
      name: 'phyllo pastry',
      quantity: { value: null, state: 'unknown', unit: 'sheet' },
    })
    expect(structureIngredient('filo pastry').canonicalName).not.toBe(
      structureIngredient('phyllo pastry').canonicalName,
    )
  })
})

describe('frozen rules-v1 intelligence validation compatibility', () => {
  it('reconstructs the complete original source structure without applying new rules', () => {
    expect(structureIngredientV1('600 g lamb mince or substitute beef')).toEqual({
      schemaVersion: 'ingredient-structure-v1',
      rulesVersion: 'ingredient-structure-rules-v1',
      originalText: '600 g lamb mince or substitute beef',
      name: 'lamb mince or substitute beef',
      sourceName: 'lamb mince or substitute beef',
      canonicalName: 'lamb mince or substitute beef',
      quantity: { text: '600', value: 600, maximum: 600, state: 'known', unit: 'g' },
      preparation: null,
      purpose: null,
      substitutions: [],
      noteReferences: [],
      provenance: 'deterministic',
      unresolved: ['alternative_product'],
    })
  })

  it.each([
    '25g / 1 1/2 tbsp unsalted butter, melted and cooled',
    '20g pine nuts toasted (note 1)',
    '3 sheets phyllo pastry note 3',
    '2 tbsp miso (use any type, I used white)',
  ])('keeps v1 source re-derivation stable for %s', (originalLineText) => {
    const old = structureIngredientV1(originalLineText)
    expect(
      structureExistingIngredientV1({
        name: old.name,
        quantity: old.quantity.text,
        unit: old.quantity.unit,
        preparation: old.preparation,
        originalLineText,
        parserVersion: 'recipe-content-v2',
      }),
    ).toEqual(old)
    expect(structureIngredient(originalLineText).rulesVersion).toBe('ingredient-structure-rules-v2')
  })
})

describe('recoverable source evidence versus flattened ingredient labels', () => {
  it('removes of only after an explicit recognised measure', () => {
    expect(structureIngredient('600 g of lamb mince or beef mince equivalent')).toMatchObject({
      name: 'lamb mince',
      quantity: { value: 600, unit: 'g' },
      substitutions: ['or beef mince equivalent'],
      unresolved: [],
    })
    expect(structureIngredient('600 mystery of lamb mince').name).toBe('mystery of lamb mince')
    expect(structureIngredient('of lamb mince').name).toBe('of lamb mince')
  })

  it.each([
    'coriander (cilantro)',
    'zucchini/courgette',
    'capsicum (bell pepper)',
    'yoghurt (also known as yogurt)',
  ])('uses existing bounded identity evidence for explicit alias %s', (line) => {
    const result = structureIngredient(line)
    expect(result.unresolved).toEqual([])
    expect(result.notes).toHaveLength(1)
    expect(result.originalText).toBe(line)
    expect(result.name).not.toMatch(/[()/]/u)
  })

  it.each([
    'cornflour (cornstarch)',
    'corn flour/corn starch',
    'chilli/red pepper flakes optional',
    'thickened/whipping/heavy cream',
    'cream (low fat)',
    'almond flour (plain flour)',
  ])('does not invent equivalence for %s', (line) => {
    const result = structureIngredient(line)
    expect(result.unresolved).toContain('alternative_product')
    expect(result.originalText).toBe(line)
    expect(result.name).toBe(line.replace(/ optional$/u, ''))
  })

  it.each(['25g 1 1 2 tbsp unsalted butter', '250ml 1 cup oat milk', '2 400 g tins tomatoes'])(
    'requires original evidence for a second flattened amount in %s',
    (line) => {
      const result = structureIngredient(line)
      expect(result.quantity).toMatchObject({ state: 'unknown', value: null })
      expect(result.unresolved).toEqual(
        expect.arrayContaining(['alternative_quantity', 'product_name']),
      )
      expect(result.originalText).toBe(line)
    },
  )

  it('does not restore a misleading saved partial quantity over uncertain source evidence', () => {
    expect(
      structureExistingIngredient({
        name: 'butter',
        quantity: '25',
        unit: 'g',
        preparation: null,
        originalLineText: '25g / 30g butter',
        parserVersion: 'recipe-content-v2',
      }).quantity.value,
    ).toBeNull()
  })

  it.each([
    'cornflour cornstarch',
    'thickened whipping heavy cream',
    'corn flour',
    'corn starch',
    'heavy whipping cream',
  ])('does not rewrite flattened words or meaningful forms without source evidence: %s', (name) => {
    expect(structureIngredient(name).name).toBe(name)
  })
})
