import type { PantryItemCategory, PantryStorageLocation } from './types'

export const PANTRY_CLASSIFICATION_VERSION = 1

export interface PantryClassification {
  category: PantryItemCategory
  storageLocation: PantryStorageLocation
  version: number
}

interface ClassificationRule {
  category: PantryItemCategory
  storageLocation: PantryStorageLocation
  terms: readonly string[]
}

const rules: readonly ClassificationRule[] = [
  {
    category: 'household',
    storageLocation: 'household_supplies',
    terms: [
      'dishwashing tablet',
      'dishwasher tablet',
      'dishwashing liquid',
      'laundry detergent',
      'cleaning spray',
      'paper towel',
      'toilet paper',
    ],
  },
  {
    category: 'dairy',
    storageLocation: 'fridge',
    terms: ['milk', 'yoghurt', 'yogurt', 'cheese', 'butter', 'cream'],
  },
  {
    category: 'meat_and_seafood',
    storageLocation: 'fridge',
    terms: ['chicken', 'beef', 'pork', 'lamb', 'mince', 'fish', 'salmon', 'prawn'],
  },
  {
    category: 'produce',
    storageLocation: 'produce_storage',
    terms: [
      'apple',
      'banana',
      'orange',
      'tomato',
      'potato',
      'onion',
      'carrot',
      'lettuce',
      'spinach',
    ],
  },
  {
    category: 'bakery',
    storageLocation: 'pantry',
    terms: ['bread', 'roll', 'wrap', 'bun'],
  },
  {
    category: 'grains_rice_and_pasta',
    storageLocation: 'pantry',
    terms: ['rice', 'pasta', 'noodle', 'couscous', 'flour', 'sugar', 'oat', 'cereal'],
  },
  {
    category: 'canned_and_jarred',
    storageLocation: 'pantry',
    terms: ['tinned', 'canned', 'chickpea', 'kidney bean', 'baked bean', 'lentil'],
  },
  {
    category: 'oils_and_vinegars',
    storageLocation: 'pantry',
    terms: ['oil', 'vinegar'],
  },
  {
    category: 'condiments_and_sauces',
    storageLocation: 'pantry',
    terms: ['sauce', 'mustard', 'mayonnaise', 'jam', 'honey', 'vegemite'],
  },
  {
    category: 'herbs_and_spices',
    storageLocation: 'pantry',
    terms: [
      'salt',
      'pepper',
      'herb',
      'spice',
      'paprika',
      'cumin',
      'turmeric',
      'cinnamon',
      'oregano',
      'basil',
    ],
  },
  {
    category: 'tea_coffee_and_drinks',
    storageLocation: 'pantry',
    terms: ['tea', 'coffee', 'juice', 'soft drink'],
  },
]

function normaliseName(name: string): string {
  return name
    .toLocaleLowerCase('en-AU')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function containsTerm(name: string, term: string): boolean {
  const normalisedTerm = normaliseName(term)
  return ` ${name} `.includes(` ${normalisedTerm} `) || ` ${name} `.includes(` ${normalisedTerm}s `)
}

export function classifyPantryItem(name: string): PantryClassification {
  const normalised = normaliseName(name)
  if (normalised === 'frozen' || normalised.startsWith('frozen ')) {
    return {
      category: 'frozen',
      storageLocation: 'freezer',
      version: PANTRY_CLASSIFICATION_VERSION,
    }
  }

  const matches = rules.filter((rule) => rule.terms.some((term) => containsTerm(normalised, term)))
  const distinct = new Set(matches.map((match) => `${match.storageLocation}/${match.category}`))
  if (distinct.size === 1 && matches[0]) {
    return {
      category: matches[0].category,
      storageLocation: matches[0].storageLocation,
      version: PANTRY_CLASSIFICATION_VERSION,
    }
  }

  return {
    category: 'uncategorised',
    storageLocation: 'other',
    version: PANTRY_CLASSIFICATION_VERSION,
  }
}
