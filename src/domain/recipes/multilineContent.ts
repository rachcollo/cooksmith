import type { Recipe, RecipeIngredientInput, RecipeInput, RecipeStepInput } from './types'

export function splitMeaningfulLines(value: string | null): string[] {
  return (value ?? '')
    .split(/\r\n|\n|\r/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function ingredientRowsToMultiline(rows: Recipe['ingredientRows']): string | null {
  const lines = rows.map((row) =>
    [row.quantity, row.unit, row.name, row.preparation].filter(Boolean).join(' ').trim(),
  )
  const text = lines.filter(Boolean).join('\n')
  return text === '' ? null : text
}

export function stepsToMultiline(steps: Recipe['steps']): string | null {
  const text = steps
    .map((step) => step.instruction.trim())
    .filter(Boolean)
    .join('\n')
  return text === '' ? null : text
}

export function recipeToMultilineInput(recipe: Recipe): RecipeInput {
  const ingredients = recipe.ingredients ?? ingredientRowsToMultiline(recipe.ingredientRows)
  const description = recipe.description ?? stepsToMultiline(recipe.steps)

  return {
    name: recipe.name,
    ingredients,
    description,
    sourceNote: recipe.sourceNote,
    sourceUrl: recipe.sourceUrl,
    authorName: recipe.authorName,
    publisherName: recipe.publisherName,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    imageUrl: recipe.imageUrl,
    notes: recipe.notes,
    category: recipe.category,
    tags: recipe.tags,
    favourite: recipe.favourite,
    ingredientRows: deriveIngredientRows(ingredients),
    steps: deriveSteps(description),
  }
}

export function deriveIngredientRows(ingredients: string | null): RecipeIngredientInput[] {
  return splitMeaningfulLines(ingredients).map((line) => ({
    name: line,
    quantity: null,
    unit: null,
    preparation: null,
  }))
}

export function deriveSteps(description: string | null): RecipeStepInput[] {
  return splitMeaningfulLines(description).map((instruction) => ({ instruction }))
}

export function prepareMultilineRecipeInput(input: RecipeInput): RecipeInput {
  return {
    ...input,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    ingredientRows: deriveIngredientRows(input.ingredients),
    steps: deriveSteps(input.description),
  }
}
