export interface ImportDraft {
  name: string
  ingredients: string | null
  description: string | null
  sourceUrl: string
  authorName: string | null
  publisherName: string | null
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  imageUrl: string | null
  warnings: string[]
}

type JsonRecord = Record<string, unknown>

function records(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(records)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonRecord
  return [record, ...records(record['@graph'])]
}

function isRecipe(record: JsonRecord) {
  const type = record['@type']
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
}

function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (value && typeof value === 'object') return text((value as JsonRecord).name)
  return null
}

function author(value: unknown): string | null {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ') || null
  return text(value)
}

function image(value: unknown): string | null {
  if (Array.isArray(value)) return image(value[0])
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return text((value as JsonRecord).url)
  return null
}

function instructionLines(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap(instructionLines)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonRecord
  if (record['@type'] === 'HowToSection') return instructionLines(record.itemListElement)
  return text(record.text) ? [text(record.text)!] : instructionLines(record.itemListElement)
}

function durationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^P(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)$/i.exec(value)
  if (!match) return null
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)
}

function servings(value: unknown): number | null {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number(match[0]) : null
}

export function extractRecipe(
  html: string,
  requestedUrl: string,
  canonicalUrl?: string,
): ImportDraft {
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
  let recipe: JsonRecord | undefined
  for (const script of scripts) {
    try {
      recipe = records(JSON.parse(script[1])).find(isRecipe)
      if (recipe) break
    } catch {
      // A malformed JSON-LD block should not hide a later valid Recipe block.
    }
  }
  if (!recipe) throw new Error('unsupported')
  const ingredientLines = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient.map(text).filter((line): line is string => Boolean(line))
    : []
  const steps = instructionLines(recipe.recipeInstructions)
  const warnings: string[] = []
  if (ingredientLines.length === 0)
    warnings.push('No ingredients were found. Add them before saving.')
  if (steps.length === 0) warnings.push('No instructions were found. Add them before saving.')
  return {
    name: text(recipe.name) ?? 'Imported recipe',
    ingredients: ingredientLines.join('\n') || null,
    description: steps.join('\n') || null,
    sourceUrl: canonicalUrl ?? requestedUrl,
    authorName: author(recipe.author),
    publisherName: text(recipe.publisher),
    servings: servings(recipe.recipeYield),
    prepTimeMinutes: durationMinutes(recipe.prepTime),
    cookTimeMinutes: durationMinutes(recipe.cookTime),
    imageUrl: image(recipe.image),
    warnings,
  }
}
