import type { PlannedMeal } from '../meal-plans/types'
import type { Recipe, RecipeIngredient, RecipeStep } from '../recipes/types'

export const preparationOpportunityRuleVersion = 'prep-opportunity-v1' as const

export type PreparationOpportunityType =
  | 'chop'
  | 'marinate'
  | 'sauce'
  | 'cook-component'
  | 'duplicate-preparation-signal'
  | 'leftover-signal'
  | 'freezer-signal'

export type PreparationOpportunitySource =
  | {
      kind: 'ingredient'
      ingredientId: string
      position: number
      text: string
    }
  | {
      kind: 'step'
      stepId: string
      position: number
      text: string
    }

export interface PlannedRecipeForPreparation {
  plannedMeal: PlannedMeal
  recipe: Recipe | null
}

export interface PreparationOpportunity {
  id: string
  ruleVersion: typeof preparationOpportunityRuleVersion
  type: PreparationOpportunityType
  householdId: string
  plannedMealId: string
  mealDate: string
  mealType: PlannedMeal['mealType']
  recipeId: string
  recipeName: string
  recipeUpdatedAt: string
  source: PreparationOpportunitySource
  ingredient: {
    name: string
    quantity: string | null
    unit: string | null
    preparation: string | null
  } | null
  reason: string
}

interface RuleMatch {
  type: PreparationOpportunityType
  reason: string
}

const ingredientPreparationRules: Array<{
  type: PreparationOpportunityType
  pattern: RegExp
  reason: string
}> = [
  {
    type: 'chop',
    pattern:
      /\b(chopp?ed?|dic(?:e|ed|ing)|slic(?:e|ed|ing)|minc(?:e|ed|ing)|shred(?:ded)?|grated?)\b/i,
    reason:
      'The ingredient preparation field explicitly describes chopping, slicing, dicing, mincing, shredding or grating.',
  },
  {
    type: 'marinate',
    pattern: /\b(marinat(?:e|ed|ing)|marinade)\b/i,
    reason: 'The ingredient preparation field explicitly describes marinating.',
  },
  {
    type: 'sauce',
    pattern: /\b(sauce|dressing|paste|pesto|vinaigrette)\b/i,
    reason:
      'The ingredient preparation field explicitly describes a sauce, dressing or paste component.',
  },
  {
    type: 'cook-component',
    pattern:
      /\b(cook(?:ed)?|roast(?:ed)?|bake(?:d)?|boil(?:ed)?|steam(?:ed)?|simmer(?:ed)?|toast(?:ed)?)\b/i,
    reason: 'The ingredient preparation field explicitly describes a cooked component.',
  },
]

const stepRules: Array<{ type: PreparationOpportunityType; pattern: RegExp; reason: string }> = [
  {
    type: 'chop',
    pattern: /\b(chop|dice|slice|mince|shred|grate)\b/i,
    reason:
      'The recipe instruction explicitly includes chopping, slicing, dicing, mincing, shredding or grating.',
  },
  {
    type: 'marinate',
    pattern: /\b(marinate|marinade)\b/i,
    reason: 'The recipe instruction explicitly includes marinating.',
  },
  {
    type: 'sauce',
    pattern:
      /\b(make|prepare|mix|stir|whisk|blend)\b[^.]{0,80}\b(sauce|dressing|paste|pesto|vinaigrette)\b/i,
    reason: 'The recipe instruction explicitly describes preparing a sauce, dressing or paste.',
  },
  {
    type: 'cook-component',
    pattern:
      /\b(cook|roast|bake|boil|steam|simmer|toast)\b[^.]{0,80}\b(ahead|before serving|until tender|until cooked|rice|lentils|beans|potatoes|grains|component)\b/i,
    reason: 'The recipe instruction explicitly describes cooking a component.',
  },
  {
    type: 'leftover-signal',
    pattern: /\bleftovers?\b/i,
    reason: 'The recipe instruction explicitly references leftovers.',
  },
  {
    type: 'freezer-signal',
    pattern: /\b(freez(?:e|er|able)|frozen)\b/i,
    reason: 'The recipe instruction explicitly references freezing or freezer suitability.',
  },
]

export function analysePreparationOpportunities(
  plannedRecipes: PlannedRecipeForPreparation[],
): PreparationOpportunity[] {
  const opportunities = plannedRecipes.flatMap(({ plannedMeal, recipe }) => {
    if (plannedMeal.recipeId === null || recipe === null || recipe.id !== plannedMeal.recipeId) {
      return []
    }

    const ingredientOpportunities = recipe.ingredientRows.flatMap((ingredient) =>
      ingredientMatches(ingredient).map((match) =>
        createOpportunity(plannedMeal, recipe, ingredientSource(ingredient), match, ingredient),
      ),
    )
    const stepOpportunities = recipe.steps.flatMap((step) =>
      stepMatches(step).map((match) =>
        createOpportunity(plannedMeal, recipe, stepSource(step), match),
      ),
    )
    const duplicateSignals = duplicatePreparationSignals(plannedMeal, recipe)

    return [...ingredientOpportunities, ...stepOpportunities, ...duplicateSignals]
  })

  return opportunities.sort(compareOpportunities)
}

function ingredientMatches(ingredient: RecipeIngredient): RuleMatch[] {
  const preparation = ingredient.preparation?.trim()
  if (!preparation) {
    return []
  }
  return ingredientPreparationRules
    .filter((rule) => rule.pattern.test(preparation))
    .map(({ type, reason }) => ({ type, reason }))
}

function stepMatches(step: RecipeStep): RuleMatch[] {
  const instruction = step.instruction.trim()
  if (!instruction) {
    return []
  }
  return stepRules
    .filter((rule) => rule.pattern.test(instruction))
    .map(({ type, reason }) => ({ type, reason }))
}

function duplicatePreparationSignals(
  plannedMeal: PlannedMeal,
  recipe: Recipe,
): PreparationOpportunity[] {
  const explicitPreparations = new Map<string, RecipeIngredient[]>()
  for (const ingredient of recipe.ingredientRows) {
    const preparation = ingredient.preparation?.trim().toLocaleLowerCase('en-AU')
    if (!preparation) {
      continue
    }
    const matchesSupportedRule = ingredientPreparationRules.some((rule) =>
      rule.pattern.test(preparation),
    )
    if (!matchesSupportedRule) {
      continue
    }
    const matchingIngredients = explicitPreparations.get(preparation) ?? []
    matchingIngredients.push(ingredient)
    explicitPreparations.set(preparation, matchingIngredients)
  }

  return [...explicitPreparations.values()].flatMap((ingredients) => {
    if (ingredients.length < 2) {
      return []
    }
    return ingredients.map((ingredient) =>
      createOpportunity(
        plannedMeal,
        recipe,
        ingredientSource(ingredient),
        {
          type: 'duplicate-preparation-signal',
          reason:
            'Multiple ingredients in this planned recipe use the same explicit preparation text.',
        },
        ingredient,
      ),
    )
  })
}

function ingredientSource(ingredient: RecipeIngredient): PreparationOpportunitySource {
  return {
    kind: 'ingredient',
    ingredientId: ingredient.id,
    position: ingredient.position,
    text: ingredient.preparation?.trim() || ingredient.originalLineText,
  }
}

function stepSource(step: RecipeStep): PreparationOpportunitySource {
  return {
    kind: 'step',
    stepId: step.id,
    position: step.position,
    text: step.instruction,
  }
}

function createOpportunity(
  plannedMeal: PlannedMeal,
  recipe: Recipe,
  source: PreparationOpportunitySource,
  match: RuleMatch,
  ingredient: RecipeIngredient | null = null,
): PreparationOpportunity {
  return {
    id: stableOpportunityId(plannedMeal.id, recipe.id, source, match.type),
    ruleVersion: preparationOpportunityRuleVersion,
    type: match.type,
    householdId: plannedMeal.householdId,
    plannedMealId: plannedMeal.id,
    mealDate: plannedMeal.mealDate,
    mealType: plannedMeal.mealType,
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeUpdatedAt: recipe.updatedAt,
    source,
    ingredient: ingredient
      ? {
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          preparation: ingredient.preparation,
        }
      : null,
    reason: match.reason,
  }
}

function stableOpportunityId(
  plannedMealId: string,
  recipeId: string,
  source: PreparationOpportunitySource,
  type: PreparationOpportunityType,
): string {
  const sourceId = source.kind === 'ingredient' ? source.ingredientId : source.stepId
  return `prep_${hashParts([preparationOpportunityRuleVersion, plannedMealId, recipeId, source.kind, sourceId, type])}`
}

function hashParts(parts: string[]): string {
  let hash = 0x811c9dc5
  for (const character of parts.join('|')) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

function compareOpportunities(left: PreparationOpportunity, right: PreparationOpportunity): number {
  return (
    left.mealDate.localeCompare(right.mealDate) ||
    left.mealType.localeCompare(right.mealType) ||
    left.plannedMealId.localeCompare(right.plannedMealId) ||
    left.recipeId.localeCompare(right.recipeId) ||
    left.source.position - right.source.position ||
    left.type.localeCompare(right.type) ||
    left.id.localeCompare(right.id)
  )
}
