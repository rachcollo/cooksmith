import type {
  ProviderIngredientSuggestion,
  ProviderPreparationOpportunity,
  RecipeIntelligenceSource,
} from './intelligence'

const MAX_INGREDIENT_SOURCE_LENGTH = 240
const MAX_STEP_SOURCE_LENGTH = 600

function compactText(value: string, maximumLength: number) {
  const compacted = value.trim().replace(/\s+/g, ' ')
  return compacted.length <= maximumLength
    ? compacted
    : `${compacted.slice(0, maximumLength - 1).trimEnd()}…`
}

export function compactRecipeSource(source: RecipeIntelligenceSource) {
  return {
    ingredients: source.ingredients.map((ingredient) => ({
      id: ingredient.id,
      text: compactText(ingredient.originalText || ingredient.name, MAX_INGREDIENT_SOURCE_LENGTH),
    })),
    steps: source.steps.map((step) => ({
      id: step.id,
      instruction: compactText(step.instruction, MAX_STEP_SOURCE_LENGTH),
    })),
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

export function normaliseProviderOutput(input: {
  ingredients: ProviderIngredientSuggestion[]
  preparationOpportunities: ProviderPreparationOpportunity[]
}) {
  const opportunityIdCounts = new Map<string, number>()
  return {
    ingredients: input.ingredients.map((ingredient) => ({
      ...ingredient,
      aliases: uniqueStrings(ingredient.aliases),
      modifiers: uniqueStrings(ingredient.modifiers),
      sourceStepIds: uniqueStrings(ingredient.sourceStepIds),
    })),
    preparationOpportunities: input.preparationOpportunities.map((opportunity) => {
      const opportunityId = opportunity.opportunityId.trim()
      const occurrence = (opportunityIdCounts.get(opportunityId) ?? 0) + 1
      opportunityIdCounts.set(opportunityId, occurrence)
      return {
        ...opportunity,
        opportunityId: occurrence === 1 ? opportunityId : `${opportunityId}-${occurrence}`,
        title: opportunity.title.trim(),
        canonicalIngredient: opportunity.canonicalIngredient.trim(),
        action: opportunity.action.trim(),
        preparationDetail: opportunity.preparationDetail?.trim() || null,
        ingredientLines: uniqueStrings(
          (opportunity.ingredientLines ?? []).map((line) => line.trim()),
        ).filter(Boolean),
        instructionSteps: (opportunity.instructionSteps ?? [])
          .map((step) => step.trim())
          .filter(Boolean),
        stoppingPoint: opportunity.stoppingPoint?.trim() ?? '',
        storageGuidance: opportunity.storageGuidance?.trim() ?? '',
        finishingGuidance: opportunity.finishingGuidance?.trim() ?? '',
        sourceIngredientIds: uniqueStrings(opportunity.sourceIngredientIds),
        sourceStepIds: uniqueStrings(opportunity.sourceStepIds),
        boundaries: uniqueStrings(
          opportunity.boundaries,
        ) as ProviderPreparationOpportunity['boundaries'],
        estimatedMinutes: Math.min(Math.max(opportunity.estimatedMinutes, 3), 120),
        estimatedTimeSavedMinutes: Math.min(
          Math.max(opportunity.estimatedTimeSavedMinutes, 0),
          180,
        ),
        maximumLeadTimeHours: Math.min(Math.max(opportunity.maximumLeadTimeHours, 1), 168),
      }
    }),
  }
}
