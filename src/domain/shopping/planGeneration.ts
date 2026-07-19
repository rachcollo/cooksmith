import type { PlannedMeal } from '../meal-plans/types'
import { splitMeaningfulLines } from '../recipes/multilineContent'
import type { Recipe } from '../recipes/types'
import type { ShoppingCategory, ShoppingItem, ShoppingItemInput } from './types'

export interface PlanAdditions {
  additions: ShoppingItemInput[]
  linkedMealCount: number
  unlinkedMealCount: number
  alreadyListedNames: string[]
}

const maxNameLength = 100
const maxUnitLength = 40

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

function normaliseKey(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
}

function parseQuantity(quantity: string | null): number | null {
  if (quantity === null) return null
  const value = Number(quantity.trim())
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100) / 100
}

interface CandidateRow {
  name: string
  quantity: number | null
  unit: string | null
}

function candidateRowsFor(recipe: Recipe): CandidateRow[] {
  if (recipe.ingredientRows.length > 0) {
    return recipe.ingredientRows.map((row) => ({
      name: row.name,
      quantity: parseQuantity(row.quantity),
      unit: row.unit?.trim().slice(0, maxUnitLength) || null,
    }))
  }
  return splitMeaningfulLines(recipe.ingredients).map((line) => ({
    name: line,
    quantity: null,
    unit: null,
  }))
}

export function buildPlanAdditions(
  meals: PlannedMeal[],
  recipes: Recipe[],
  existingItems: ShoppingItem[],
): PlanAdditions {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const existingKeys = new Set(existingItems.map((item) => normaliseKey(item.name)))
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
    for (const row of candidateRowsFor(recipe)) {
      const displayName = row.name.trim().replace(/\s+/gu, ' ').slice(0, maxNameLength)
      const key = normaliseKey(displayName)
      if (key === '') continue
      if (existingKeys.has(key)) {
        alreadyListed.set(key, displayName)
        continue
      }
      const current = merged.get(key)
      if (!current) {
        merged.set(key, {
          name: displayName,
          quantity: row.quantity,
          unit: row.unit,
          category: categoriseIngredient(displayName),
        })
        continue
      }
      const sameUnit =
        (current.unit ?? '').toLocaleLowerCase() === (row.unit ?? '').toLocaleLowerCase()
      if (current.quantity !== null && row.quantity !== null && sameUnit) {
        current.quantity = Math.round((current.quantity + row.quantity) * 100) / 100
      } else {
        current.quantity = null
        current.unit = null
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
