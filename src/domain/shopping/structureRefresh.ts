import type { Recipe } from '../recipes/types'
import { deriveRecipeContent } from '../recipes/contentDerivation'
import { canonicalIngredientName } from './ingredientIdentity'
import { buildPlanAdditions } from './planGeneration'
import type { ShoppingItemInput, ShoppingSourceQuantity } from './types'

/** Match surviving source lines only. Removed purchases and newly added recipe lines stay removed. */
export function refreshedIngredientInputs(
  recipe: Recipe,
  sources: ShoppingSourceQuantity[],
): ShoppingItemInput[] | null {
  const rows = recipe.ingredientRows.length
    ? recipe.ingredientRows
    : deriveRecipeContent(recipe.ingredients, null).ingredients.map((row, position) => ({
        ...row,
        id: `line-${position}`,
        position,
      }))
  const remaining = [...rows]
  const matched = sources.map((source) => {
    const index = remaining.findIndex((row) => {
      if (source.sourceIngredientId)
        return (
          row.id === source.sourceIngredientId &&
          (!source.originalText || row.originalLineText === source.originalText)
        )
      if (source.originalText) return row.originalLineText === source.originalText
      const original = [source.quantity, source.unit, source.name]
        .filter((value) => value !== null && value !== '')
        .join(' ')
      if (
        row.originalLineText.trim().replace(/\s+/gu, ' ') === original.trim().replace(/\s+/gu, ' ')
      )
        return true
      // Legacy contributions retained product, amount and unit, but not a source-line ID.
      return (
        [row.name, 'legacyName' in row ? row.legacyName : null]
          .filter(Boolean)
          .some(
            (name) => canonicalIngredientName(name!) === canonicalIngredientName(source.name),
          ) &&
        row.quantity === (source.quantity === null ? null : String(source.quantity)) &&
        row.unit === source.unit
      )
    })
    return index < 0 ? undefined : remaining.splice(index, 1)[0]
  })
  if (!sources.length || matched.some((row) => !row)) return null
  return buildPlanAdditions(
    [
      {
        recipeState: {
          kind: 'active',
          recipe: { id: recipe.id, name: recipe.name, archivedAt: recipe.archivedAt },
        },
      },
    ],
    [{ ...recipe, ingredientRows: matched.filter((row) => row !== undefined) }],
    [],
  ).additions
}

function orderedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedJson)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, orderedJson(item)]),
    )
  return value
}

/** JSONB does not retain object key order; compare source evidence semantically. */
export function sameIngredientSources(
  left: ShoppingSourceQuantity[],
  right: ShoppingSourceQuantity[],
): boolean {
  const keys = (values: ShoppingSourceQuantity[]) =>
    values.map((value) => JSON.stringify(orderedJson(value))).sort()
  return JSON.stringify(keys(left)) === JSON.stringify(keys(right))
}
