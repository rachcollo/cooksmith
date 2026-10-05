import type { Recipe } from '../recipes/types'
import {
  structureIngredient,
  structureExistingIngredient,
  type IngredientStructure,
} from '../recipes/ingredientStructure'

export interface PurchaseIngredient {
  conversionName?: string
  name: string
  quantity: string | null
  unit: string | null
  originalText?: string
  sourceName?: string
  sourceIngredientId?: string
  legacyNames?: string[]
  structure?: IngredientStructure
}

export function parsePurchaseLine(line: string): PurchaseIngredient {
  const structure = structureIngredient(line)
  return fromStructure(structure)
}

function fromStructure(structure: IngredientStructure): PurchaseIngredient {
  return {
    name: structure.name,
    quantity: structure.quantity.text,
    unit: structure.quantity.unit,
    originalText: structure.originalText,
    sourceName: structure.sourceName,
    structure,
  }
}

/** Legacy saved purchase labels use the same grammar without rewriting their storage identity. */
export function purchaseDisplayName(name: string): string {
  return structureIngredient(name).name
}

export function purchaseProductName(name: string): string {
  return structureIngredient(name).name
}

export function purchaseIngredientsFor(recipe: Recipe): PurchaseIngredient[] {
  if (!recipe.ingredientRows.length)
    return (recipe.ingredients ?? '')
      .split(/\r?\n|\r/u)
      .map(parsePurchaseLine)
      .filter((row) => row.name)
  return recipe.ingredientRows.map((row) => {
    const structure = structureExistingIngredient(row)
    return {
      ...fromStructure(structure),
      sourceIngredientId: row.id,
      legacyNames: [row.legacyName ?? row.name, structure.sourceName],
      // Measured-form qualifiers remain evidence even if a provider separated preparation.
      conversionName: [structureIngredient(row.originalLineText ?? row.name).name, row.preparation]
        .filter(Boolean)
        .join(' '),
    }
  })
}
