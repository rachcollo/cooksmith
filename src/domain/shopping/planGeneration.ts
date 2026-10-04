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
  meals: Pick<PlannedMeal, 'recipeState'>[],
  recipes: Recipe[],
  existingItems: ShoppingItem[],
): PlanAdditions {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
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
    const recipe =
      meal.recipeState.kind === 'active' ? recipesById.get(meal.recipeState.recipe.id) : undefined
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
      const canonicalUnit = purchaseMeasure(row.unit)
      const key = ingredientPurchaseKey(displayName, canonicalUnit.unit)
      if (displayName === '') continue
      const parsedQuantity = parseIngredientQuantity(row.quantity)
      const quantity =
        parsedQuantity === null
          ? null
          : Math.round(parsedQuantity * canonicalUnit.multiplier * 100) / 100
      const source = {
        purchaseName: displayName,
        name: row.name,
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
        current.quantity = Math.round((current.quantity + quantity) * 100) / 100
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
