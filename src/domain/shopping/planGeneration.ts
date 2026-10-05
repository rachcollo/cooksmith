import { convertPurchaseAmount, recipeMeasures } from '../measurements/purchaseMeasures'
import type { PlannedMeal } from '../meal-plans/types'
import { purchaseIngredientsFor, purchaseProductName } from './purchaseIngredients'
import { purchaseMeasure } from './purchaseGroups'
import type { Recipe } from '../recipes/types'
import type { ShoppingCategory, ShoppingItem, ShoppingItemInput } from './types'
import {
  canonicalIngredientName,
  ingredientPurchaseKey,
  parseIngredientQuantity,
} from './ingredientIdentity'

export interface PlanAdditions {
  additions: ShoppingItemInput[]
  linkedMealCount: number
  unlinkedMealCount: number
  alreadyListedNames: string[]
}

const maxNameLength = 100

const categoryKeywords: [ShoppingCategory, string[]][] = [
  ['frozen', ['frozen', 'ice cream']],
  [
    'pantry',
    [
      'coconut milk',
      'coconut cream',
      'tomato paste',
      'curry paste',
      'stock',
      'flour',
      'sugar',
      'rice',
      'pasta',
      'noodle',
      'oil',
      'vinegar',
      'soy sauce',
      'sauce',
      'salt',
      'pepper',
      'spice',
      'cumin',
      'paprika',
      'oregano',
      'lentil',
      'chickpea',
      'canned',
      'tinned',
      'honey',
      'oats',
      'couscous',
      'quinoa',
      'mustard',
      'peanut butter',
    ],
  ],
  [
    'meat_and_seafood',
    [
      'chicken',
      'beef',
      'pork',
      'lamb',
      'mince',
      'bacon',
      'sausage',
      'ham',
      'chorizo',
      'steak',
      'turkey',
      'fish',
      'salmon',
      'tuna',
      'prawn',
      'seafood',
    ],
  ],
  [
    'dairy_and_eggs',
    [
      'milk',
      'cheese',
      'butter',
      'cream',
      'yoghurt',
      'yogurt',
      'egg',
      'feta',
      'parmesan',
      'mozzarella',
      'haloumi',
    ],
  ],
  ['bakery', ['bread', 'roll', 'wrap', 'tortilla', 'bun', 'pita', 'bagel', 'croissant']],
  [
    'produce',
    [
      'spring onion',
      'sweet potato',
      'onion',
      'garlic',
      'tomato',
      'potato',
      'carrot',
      'capsicum',
      'zucchini',
      'cucumber',
      'lettuce',
      'spinach',
      'kale',
      'cabbage',
      'broccoli',
      'cauliflower',
      'mushroom',
      'pumpkin',
      'celery',
      'corn',
      'peas',
      'bean',
      'apple',
      'banana',
      'lemon',
      'lime',
      'orange',
      'berries',
      'berry',
      'avocado',
      'ginger',
      'chilli',
      'coriander',
      'parsley',
      'basil',
      'mint',
      'salad',
    ],
  ],
  ['household', ['paper towel', 'foil', 'cling wrap', 'detergent', 'dishwashing', 'soap']],
]

const orderedKeywords = categoryKeywords
  .flatMap(([category, keywords]) => keywords.map((keyword) => ({ category, keyword })))
  .sort((left, right) => right.keyword.length - left.keyword.length)

export function categoriseIngredient(name: string): ShoppingCategory {
  const normalised = name.toLocaleLowerCase()
  return orderedKeywords.find(({ keyword }) => normalised.includes(keyword))?.category ?? 'other'
}

export function buildPlanAdditions(
  meals: (Pick<PlannedMeal, 'recipeState'> & Partial<Pick<PlannedMeal, 'recipeSource'>>)[],
  recipes: Recipe[],
  existingItems: ShoppingItem[],
): PlanAdditions {
  const recipesById = new Map(
    recipes.map((recipe) => [
      `${recipe.scope === 'household' || !recipe.scope ? 'household' : 'imported'}:${recipe.id}`,
      recipe,
    ]),
  )
  const existingKeys = new Set(
    existingItems
      .filter((item) => item.manual === false)
      .map((item) => ingredientPurchaseKey(item.name, purchaseMeasure(item.unit).unit)),
  )
  const merged = new Map<string, ShoppingItemInput>()
  const alreadyListed = new Map<string, string>()
  let linkedMealCount = 0
  let unlinkedMealCount = 0

  for (const meal of meals) {
    const recipeId = meal.recipeState.kind === 'active' ? meal.recipeState.recipe.id : null
    const matching = recipes.filter((candidate) => candidate.id === recipeId)
    const recipe = recipeId
      ? meal.recipeSource
        ? recipesById.get(`${meal.recipeSource}:${recipeId}`)
        : matching.length === 1
          ? matching[0]
          : undefined
      : undefined
    if (!recipe) {
      unlinkedMealCount += 1
      continue
    }
    linkedMealCount += 1
    for (const row of purchaseIngredientsFor(recipe)) {
      const displayName = canonicalIngredientName(purchaseProductName(row.name)).slice(
        0,
        maxNameLength,
      )
      const convention = recipeMeasures(recipe)
      const converted = convertPurchaseAmount(
        row.conversionName ?? displayName,
        row.structure && ['known', 'approximate'].includes(row.structure.quantity.state)
          ? row.structure.quantity.value
          : parseIngredientQuantity(row.quantity),
        row.unit,
        convention.system,
      )
      const canonicalUnit = { unit: converted.unit, multiplier: 1 }
      const key = ingredientPurchaseKey(displayName, canonicalUnit.unit)
      if (displayName === '') continue
      const quantity = converted.quantity
      const source = {
        ingredientStructure: row.structure,
        sourceIngredientId: row.sourceIngredientId,
        sourceRecipeId: recipe.id,
        sourceRecipeKind: recipe.scope ?? 'household',
        sourceRecipeVersion: recipe.updatedAt,
        originalText: row.originalText,
        legacyPurchaseNames: [
          ...new Set(
            [row.sourceName ?? row.name, ...(row.legacyNames ?? [])].map(canonicalIngredientName),
          ),
        ],
        purchaseName: displayName,
        measurementSystem: convention.system,
        measureSource: convention.source,
        purchaseUnit: converted.unit,
        approximate: converted.approximate || row.structure?.quantity.state === 'approximate',
        conversionId: converted.conversionId,
        name: row.sourceName ?? row.name,
        quantity: row.quantity,
        unit: row.unit,
      }
      if (existingKeys.has(key)) {
        alreadyListed.set(key, displayName)
        continue
      }
      const current = merged.get(key)
      if (!current) {
        merged.set(key, {
          name: displayName,
          quantity,
          unit: canonicalUnit.unit,
          category: categoriseIngredient(displayName),
          sourceQuantities: [source],
        })
        continue
      }
      current.sourceQuantities?.push(source)
      if (current.quantity !== null && quantity !== null) {
        current.quantity += quantity
      } else {
        current.quantity = null
      }
    }
  }

  return {
    additions: [...merged.values()],
    linkedMealCount,
    unlinkedMealCount,
    alreadyListedNames: [...alreadyListed.values()],
  }
}
