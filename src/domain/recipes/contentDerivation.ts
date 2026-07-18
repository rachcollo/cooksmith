import type { RecipeIngredientInput, RecipeStepInput } from './types'

export const recipeContentParserVersion = 'recipe-content-v1'

const knownUnits = new Set([
  'tsp',
  'teaspoon',
  'teaspoons',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'cup',
  'cups',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'ml',
  'l',
  'litre',
  'litres',
  'pinch',
  'clove',
  'cloves',
  'slice',
  'slices',
  'can',
  'cans',
])

const quantityPattern = String.raw`(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])`
const quantityRangePattern = new RegExp(
  String.raw`^(${quantityPattern})(?:\s*(?:-|–|—|to)\s*(${quantityPattern}))?\s+(.*)$`,
  'u',
)
const decorativeInstructionPrefix = /^\s*(?:\(?\d+[.)]|[-*•–—])\s+/u

export interface DerivedRecipeIngredient extends RecipeIngredientInput {
  originalLineText: string
  parserVersion: string
  derivationStatus: 'derived' | 'display_only'
}

export interface DerivedRecipeStep extends RecipeStepInput {
  originalLineText: string
  parserVersion: string
  derivationStatus: 'derived'
}

export interface DerivedRecipeContent {
  parserVersion: string
  ingredients: DerivedRecipeIngredient[]
  steps: DerivedRecipeStep[]
  warnings: string[]
}

function logicalLines(source: string | null): string[] {
  return (source ?? '')
    .split(/\r\n|\n|\r/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function deriveIngredient(line: string, parserVersion: string): DerivedRecipeIngredient {
  const match = quantityRangePattern.exec(line)
  if (!match) {
    return {
      name: line,
      quantity: null,
      unit: null,
      preparation: null,
      originalLineText: line,
      parserVersion,
      derivationStatus: 'display_only',
    }
  }

  const start = match[1] ?? ''
  const end = match[2]
  const remainder = match[3] ?? ''
  const [maybeUnit, ...nameParts] = remainder.trim().split(/\s+/u)
  const hasUnit = maybeUnit ? knownUnits.has(maybeUnit.toLocaleLowerCase()) : false
  const name = (hasUnit ? nameParts.join(' ') : remainder.trim()).trim()

  if (maybeUnit?.toLocaleLowerCase() === 'x' || !name) {
    return {
      name: line,
      quantity: null,
      unit: null,
      preparation: null,
      originalLineText: line,
      parserVersion,
      derivationStatus: 'display_only',
    }
  }

  return {
    name,
    quantity: end ? `${start}-${end}` : start,
    unit: hasUnit && maybeUnit ? maybeUnit : null,
    preparation: null,
    originalLineText: line,
    parserVersion,
    derivationStatus: 'derived',
  }
}

export function deriveRecipeContent(
  ingredientSource: string | null,
  instructionSource: string | null,
  parserVersion = recipeContentParserVersion,
): DerivedRecipeContent {
  return {
    parserVersion,
    ingredients: logicalLines(ingredientSource).map((line) =>
      deriveIngredient(line, parserVersion),
    ),
    steps: logicalLines(instructionSource).map((line) => ({
      instruction: line.replace(decorativeInstructionPrefix, '').trim(),
      originalLineText: line,
      parserVersion,
      derivationStatus: 'derived',
    })),
    warnings: [],
  }
}
