import { canonicalIngredientName, canonicalIngredientUnit } from '../shopping/ingredientIdentity'

export const measurementSystems = ['unknown', 'au', 'metric', 'us'] as const
export type MeasurementSystem = (typeof measurementSystems)[number]
export const measurementLabels: Record<MeasurementSystem, string> = {
  unknown: 'Use verified source, otherwise unspecified',
  au: 'Australian — 20 ml tablespoon, 250 ml cup',
  metric: 'Metric — 15 ml tablespoon, 250 ml cup',
  us: 'US cooking — 15 ml tablespoon, 240 ml cup',
}
export const measureSources = {
  au: 'https://www.taste.com.au/images/common/Taste-Weights-Measurements-A3-V4.pdf',
  metric: 'https://www.donnahay.com.au/recipes/conversion',
  us: 'https://www.nist.gov/pml/owm/metric-si/metric-kitchen/metric-kitchen-cooking-measurement-equivalencies',
} as const
export function recipeMeasures(recipe: {
  measurementSystem?: MeasurementSystem
  sourceUrl?: string | null
}): { system: MeasurementSystem; source: string | null } {
  if (recipe.measurementSystem && recipe.measurementSystem !== 'unknown')
    return { system: recipe.measurementSystem, source: 'recipe-confirmed' }
  // Exact publisher allow-list backed by its own chart; never infer from a country suffix or user locale.
  try {
    const host = new URL(recipe.sourceUrl ?? '').hostname.toLowerCase().replace(/^www\./u, '')
    if (host === 'taste.com.au' || host === 'donnahay.com.au')
      return {
        system: 'au',
        source: host === 'taste.com.au' ? measureSources.au : measureSources.metric,
      }
  } catch {
    /* No verified publisher convention. */
  }
  return { system: 'unknown', source: null }
}
export function normaliseMeasure(unit: string | null, system: MeasurementSystem = 'unknown') {
  const measure = canonicalIngredientUnit(unit?.trim().replace(/\.$/u, '') ?? null)
  if (system !== 'unknown' && ['tsp', 'tbsp', 'cup'].includes(measure.unit ?? '')) {
    const sizes = { tsp: 5, tbsp: system === 'au' ? 20 : 15, cup: system === 'us' ? 240 : 250 }
    return { unit: 'ml', multiplier: sizes[measure.unit as keyof typeof sizes] }
  }
  return measure
}

export interface IngredientMeasure {
  id: string
  version: 1
  names: readonly string[]
  grams: number
  millilitres: number
  purchaseUnit: 'g' | 'ml'
  sourceUrl: string
  sourceDescription: string
  reviewedOn: string
}
const taste = measureSources.au
// Deliberately bounded, reviewed data. Exact names encode product/form; never fuzzy-match density.
// These are approximate shopping equivalents, not baking instructions or nutrition calculations.
export const ingredientMeasures: readonly IngredientMeasure[] = [
  {
    id: 'taste-plain-flour-v1',
    version: 1,
    names: ['plain flour'],
    grams: 150,
    millilitres: 250,
    purchaseUnit: 'g',
    sourceUrl: taste,
    sourceDescription: 'Plain flour: 150 g per 250 mL cup; level, not sifted or packed.',
    reviewedOn: '2026-10-04',
  },
  {
    id: 'taste-self-raising-flour-v1',
    version: 1,
    names: ['self raising flour'],
    grams: 150,
    millilitres: 250,
    purchaseUnit: 'g',
    sourceUrl: taste,
    sourceDescription: 'Self-raising flour: 150 g per 250 mL cup; level, not sifted or packed.',
    reviewedOn: '2026-10-04',
  },
  {
    id: 'taste-butter-v1',
    version: 1,
    names: ['butter', 'unsalted butter', 'salted butter'],
    grams: 250,
    millilitres: 250,
    purchaseUnit: 'g',
    sourceUrl: taste,
    sourceDescription:
      'Butter: published cookery equivalent 250 g per 250 mL cup; excludes whipped, spreadable and melted forms.',
    reviewedOn: '2026-10-04',
  },
  {
    id: 'taste-caster-sugar-v1',
    version: 1,
    names: ['caster sugar'],
    grams: 220,
    millilitres: 250,
    purchaseUnit: 'g',
    sourceUrl: taste,
    sourceDescription: 'Caster sugar: 220 g per 250 mL cup, level.',
    reviewedOn: '2026-10-04',
  },
  {
    id: 'taste-white-sugar-v1',
    version: 1,
    names: ['white sugar'],
    grams: 225,
    millilitres: 250,
    purchaseUnit: 'g',
    sourceUrl: taste,
    sourceDescription: 'White sugar: 225 g per 250 mL cup, level.',
    reviewedOn: '2026-10-04',
  },
  {
    id: 'codex-olive-oil-v1',
    version: 1,
    names: ['olive oil', 'extra virgin olive oil', 'virgin olive oil'],
    grams: 91.3,
    millilitres: 100,
    purchaseUnit: 'ml',
    sourceUrl: 'https://workspace.fao.org/sites/codex/Standards/CXS%2033-1981/CXS_033e.pdf',
    sourceDescription:
      'CXS 33-1981 (2024), appendix 2.1: relative density 0.910–0.916 at 20°C. Midpoint 0.913 used as an approximate g/mL shopping equivalent (water approximated as 1 g/mL). Cross-check: Cobram label 13.7 g fat/15 mL, 100% EVOO. Excludes sprays, blends, infused/heated oil.',
    reviewedOn: '2026-10-04',
  },
]
export function convertPurchaseAmount(
  name: string,
  quantity: number | null,
  unit: string | null,
  system: MeasurementSystem = 'unknown',
) {
  const measure = normaliseMeasure(
    unit,
    /\b(heaped|heaping|scant|generous)\b/iu.test(name) ? 'unknown' : system,
  )
  let amount = quantity === null ? null : quantity * measure.multiplier
  let outputUnit = measure.unit
  const identity = canonicalIngredientName(name)
  const reference = ingredientMeasures.find((entry) => entry.names.includes(identity))
  let approximation: IngredientMeasure | undefined
  if (
    amount !== null &&
    reference &&
    ((outputUnit === 'ml' && reference.purchaseUnit === 'g') ||
      (outputUnit === 'g' && reference.purchaseUnit === 'ml'))
  ) {
    amount *=
      outputUnit === 'ml'
        ? reference.grams / reference.millilitres
        : reference.millilitres / reference.grams
    outputUnit = reference.purchaseUnit
    approximation = reference
  }
  return {
    quantity: amount,
    unit: outputUnit,
    approximate: Boolean(approximation),
    conversionId: approximation?.id ?? null,
  }
}
