import type { RecipeIngredientInput, RecipeStepInput } from './types'

import { structureIngredient, ingredientStructureParserVersion } from './ingredientStructure'

export const recipeContentParserVersion = ingredientStructureParserVersion

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
  return (source ?? '').split(/\r\n|\n|\r/u).filter((line) => line.trim().length > 0)
}

function deriveIngredient(line: string, parserVersion: string): DerivedRecipeIngredient {
  const structure = structureIngredient(line)
  return {
    name: structure.name,
    quantity: structure.quantity.package
      ? String(structure.quantity.value)
      : structure.quantity.text,
    unit: structure.quantity.unit,
    preparation: structure.preparation,
    originalLineText: line,
    parserVersion,
    derivationStatus: structure.quantity.state === 'unknown' ? 'display_only' : 'derived',
    structure,
  }
}

export function deriveRecipeContent(
  ingredientSource: string | null,
  instructionSource: string | null,
  parserVersion: string = recipeContentParserVersion,
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
