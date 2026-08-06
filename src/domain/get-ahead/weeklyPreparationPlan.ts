import type {
  EnrichmentConfidence,
  QuantityState,
  RecipePreparationOpportunityKind,
} from '../recipes/intelligence'

export const weeklyPreparationPlanSchemaVersion = 'weekly-preparation-plan-v2' as const
export const weeklyPreparationPlannerVersion = 'weekly-preparation-planner-v13' as const

export const weeklyPreparationQualityRules = {
  version: 'weekly-preparation-quality-v8',
  timeBudgets: [15, 30, 45, 60],
  minimumTaskMinutes: 5,
  maximumTaskMinutes: 120,
  maximumTimeSavedMinutes: 180,
  safeActions: [
    'blend',
    'bake',
    'boil',
    'chop',
    'dice',
    'grate',
    'marinate',
    'mince',
    'mix',
    'cook',
    'roast',
    'roughly_chop',
    'shred',
    'slice',
    'simmer',
    'steam',
    'toast',
    'whisk',
  ],
  protectedBoundaries: ['raw-protein', 'cross-contamination'],
  boundaryPolicy:
    'Allow recipe-ready raw-protein preparation, but keep it separate from clean and ready-to-eat preparation.',
  durationPolicy:
    'Estimate an average home cook, count shared setup and clean-up once, and treat the selected duration as a maximum rather than a target.',
  rejectedTaskFragments: [
    'cook off',
    'preheat',
    'remove from',
    'reserve water',
    'serve immediately',
    'simmer',
    'while hot',
  ],
} as const

export type PreparationBoundary =
  'allergen' | 'batch-component' | 'cross-contamination' | 'raw-protein' | 'storage' | 'timing'

export type WeeklyPreparationCandidate = {
  id: string
  householdId: string
  planId: string
  plannedMealId: string
  recipeId: string
  recipeVersionId: string
  enrichmentVersion: string
  servings: number
  sourceIngredientId: string
  sourceStepIds: string[]
  originalText: string
  canonicalIngredient: string | null
  canonicalAction: string | null
  preparationDetail: string | null
  opportunityKind?: RecipePreparationOpportunityKind
  ingredientLines?: string[]
  instructionSteps?: string[]
  stoppingPoint?: string
  finishingGuidance?: string
  providerStorageGuidance?: string
  quantity: {
    state: QuantityState
    value: number | null
    unit: string | null
  }
  maximumLeadTimeHours: number | null
  storageGuidanceReference: string | null
  boundaries: PreparationBoundary[]
  confidence: EnrichmentConfidence
}

export type WeeklyPreparationSource = Pick<
  WeeklyPreparationCandidate,
  | 'id'
  | 'plannedMealId'
  | 'recipeId'
  | 'recipeVersionId'
  | 'sourceIngredientId'
  | 'sourceStepIds'
  | 'originalText'
  | 'ingredientLines'
  | 'instructionSteps'
  | 'stoppingPoint'
  | 'finishingGuidance'
  | 'providerStorageGuidance'
>

export type WeeklyPreparationSubtask = {
  id: string
  title: string
  canonicalAction: string | null
  preparationDetail: string | null
  quantity: WeeklyPreparationCandidate['quantity']
  sources: WeeklyPreparationSource[]
  ingredientLines?: string[]
  instructionSteps?: string[]
  stoppingPoint?: string
  finishingGuidance?: string
}

export type WeeklyPreparationTask = {
  id: string
  title: string
  canonicalCategory: string
  decision: 'combined' | 'grouped' | 'separate'
  reasonCode:
    | 'compatible'
    | 'meaningful_preparation_difference'
    | 'safety_boundary'
    | 'uncertain_metadata'
    | 'unknown_quantity'
  subtasks: WeeklyPreparationSubtask[]
  confidence: EnrichmentConfidence
  validation: 'validated'
  estimatedMinutes?: number
  estimatedTimeSavedMinutes?: number
  storageGuidance?: string
  priority?: number
}

export type WeeklyPreparationPlan = {
  schemaVersion: typeof weeklyPreparationPlanSchemaVersion
  plannerVersion: typeof weeklyPreparationPlannerVersion
  householdId: string
  planId: string
  cacheKey: string
  tasks: WeeklyPreparationTask[]
  ambiguousCandidateIds: string[]
  generation: 'deterministic' | 'model-assisted' | 'fallback'
  fallbackReason: string | null
}

export type WeeklyPreparationModelDecision = {
  tasks: Array<{
    candidateIds: string[]
    title: string
    estimatedMinutes: number
    estimatedTimeSavedMinutes: number
  }>
}

export function createWeeklyPreparationCacheKey(candidates: WeeklyPreparationCandidate[]) {
  return stableHash([
    weeklyPreparationPlannerVersion,
    weeklyPreparationQualityRules.version,
    ...candidates
      .map((candidate) =>
        [
          candidate.planId,
          candidate.id,
          candidate.plannedMealId,
          candidate.recipeId,
          candidate.recipeVersionId,
          candidate.enrichmentVersion,
          candidate.servings,
          candidate.sourceIngredientId,
          candidate.quantity.state,
          candidate.quantity.value ?? 'unknown',
          candidate.quantity.unit ?? 'unknown',
          candidate.maximumLeadTimeHours ?? 'unknown',
          candidate.storageGuidanceReference ?? 'unknown',
          candidate.canonicalAction ?? 'unknown',
          candidate.preparationDetail ?? 'unknown',
          candidate.opportunityKind ?? 'unknown',
          ...(candidate.instructionSteps ?? []),
          candidate.stoppingPoint ?? 'unknown',
          [...candidate.boundaries].sort().join(','),
        ].join(':'),
      )
      .sort(),
  ])
}

export function buildDeterministicWeeklyPreparationPlan(
  candidates: WeeklyPreparationCandidate[],
): WeeklyPreparationPlan {
  const first = candidates[0]
  const householdId = first?.householdId ?? ''
  const planId = first?.planId ?? ''
  if (
    candidates.some(
      (candidate) => candidate.householdId !== householdId || candidate.planId !== planId,
    )
  )
    throw new Error('mixed_plan_scope')

  const ingredientGroups = new Map<string, WeeklyPreparationCandidate[]>()
  for (const candidate of candidates.filter(isDeterministicallyUseful)) {
    const key = candidate.canonicalIngredient ?? `unknown:${candidate.id}`
    ingredientGroups.set(key, [...(ingredientGroups.get(key) ?? []), candidate])
  }

  const tasks: WeeklyPreparationTask[] = []
  const ambiguousCandidateIds: string[] = []
  for (const [category, group] of ingredientGroups) {
    const partitions = partitionByCompatibility(group)
    if (partitions.length === 1 && partitions[0] && partitions[0].length > 1) {
      tasks.push(combinedTask(category, partitions[0]))
      continue
    }

    const shouldGroup = group.length > 1 && group.every(hasUsableIdentity)
    if (shouldGroup) {
      tasks.push(groupedTask(category, partitions))
      if (
        (partitions.length > 1 && !group.some((candidate) => candidate.boundaries.length > 0)) ||
        group.some(
          (candidate) => candidate.confidence === 'low' || candidate.confidence === 'unknown',
        )
      )
        ambiguousCandidateIds.push(...group.map((candidate) => candidate.id))
      continue
    }

    tasks.push(...group.map((candidate) => separateTask(category, candidate)))
  }

  return {
    schemaVersion: weeklyPreparationPlanSchemaVersion,
    plannerVersion: weeklyPreparationPlannerVersion,
    householdId,
    planId,
    cacheKey: createWeeklyPreparationCacheKey(candidates),
    tasks: tasks.sort(compareTasks),
    ambiguousCandidateIds: [...new Set(ambiguousCandidateIds)].sort(),
    generation: 'deterministic',
    fallbackReason: null,
  }
}

export function applyAndValidateModelDecision(
  fallback: WeeklyPreparationPlan,
  candidates: WeeklyPreparationCandidate[],
  decision: WeeklyPreparationModelDecision,
  availableMinutes = 240,
  options: { allowEmpty?: boolean } = {},
): { ok: true; value: WeeklyPreparationPlan } | { ok: false; reason: string } {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const used = new Set<string>()
  const replacementTasks: WeeklyPreparationTask[] = []
  for (const [priority, group] of decision.tasks.entries()) {
    if (group.candidateIds.length === 0) return { ok: false, reason: 'empty_group' }
    const candidateIds = group.candidateIds.filter((id) => {
      if (used.has(id)) return false
      used.add(id)
      return true
    })
    if (candidateIds.length === 0) continue
    if (
      !Number.isInteger(group.estimatedMinutes) ||
      group.estimatedMinutes < 5 ||
      group.estimatedMinutes > 120 ||
      !Number.isInteger(group.estimatedTimeSavedMinutes) ||
      group.estimatedTimeSavedMinutes < 0 ||
      group.estimatedTimeSavedMinutes > 180
    )
      return { ok: false, reason: 'invalid_estimate' }
    const title = group.title.trim()
    if (
      title.length < 4 ||
      title.length > 100 ||
      /[()[\]{}]|\b(preheat|reserve .*water)\b/i.test(title)
    )
      return { ok: false, reason: 'malformed_task' }
    for (const id of candidateIds) {
      if (!byId.has(id)) return { ok: false, reason: 'unsupported_reference' }
    }
    const supplied = candidateIds.flatMap((id) => byId.get(id) ?? [])
    if (supplied.some((candidate) => !isWeeklyPreparationCandidateEligible(candidate)))
      return { ok: false, reason: 'unsafe_make_ahead_task' }
    if (new Set(supplied.map(preparationHygieneClass)).size > 1)
      return { ok: false, reason: 'mixed_hygiene_boundary' }
    const category = supplied
      .map((candidate) => candidate.canonicalIngredient)
      .filter(Boolean)
      .join(', ')
    const task =
      supplied.length > 1 && partitionByCompatibility(supplied).length === 1
        ? combinedTask(category, supplied)
        : separateCandidatesTask(category || 'ingredients', supplied)
    const estimatedMinutes = calibratedTaskMinutes(supplied, group.estimatedMinutes)
    const plannedMinutes = replacementTasks.reduce(
      (sum, existing) => sum + (existing.estimatedMinutes ?? 0),
      0,
    )
    if (plannedMinutes + estimatedMinutes > availableMinutes) continue
    replacementTasks.push({
      ...task,
      title: isConcisePreparationTitle(title) ? title : preparationTitleFor(supplied),
      estimatedMinutes,
      estimatedTimeSavedMinutes: group.estimatedTimeSavedMinutes,
      storageGuidance: storageGuidanceFor(supplied),
      priority: priority + 1,
    })
  }
  if (replacementTasks.length === 0 && !options.allowEmpty)
    return { ok: false, reason: 'no_worthwhile_preparation' }
  return {
    ok: true,
    value: {
      ...fallback,
      tasks: replacementTasks,
      ambiguousCandidateIds: [],
      generation: 'model-assisted',
      fallbackReason: null,
    },
  }
}

function calibratedTaskMinutes(candidates: WeeklyPreparationCandidate[], modelEstimate: number) {
  if (
    candidates.some((candidate) =>
      ['component_cook', 'meal_cook'].includes(candidate.opportunityKind ?? ''),
    )
  )
    return modelEstimate
  const actionMinutes = candidates.reduce((sum, candidate) => {
    switch (candidate.canonicalAction) {
      case 'marinate':
      case 'mix':
      case 'whisk':
        return sum + 3
      case 'mince':
      case 'grate':
      case 'shred':
        return sum + 4
      default:
        return sum + 3
    }
  }, 0)
  const sharedSetupAndCleanupMinutes = 3
  const averageCookEstimate = Math.max(
    weeklyPreparationQualityRules.minimumTaskMinutes,
    sharedSetupAndCleanupMinutes + actionMinutes,
  )
  return Math.min(modelEstimate, averageCookEstimate)
}

const safePreparationActions = new Set<string>(weeklyPreparationQualityRules.safeActions)

function isDeterministicallyUseful(candidate: WeeklyPreparationCandidate) {
  return (
    isWeeklyPreparationCandidateEligible(candidate) &&
    candidate.confidence !== 'low' &&
    candidate.confidence !== 'unknown'
  )
}

export function isWeeklyPreparationCandidateEligible(candidate: WeeklyPreparationCandidate) {
  const action = candidate.canonicalAction?.trim().toLowerCase()
  if (!action || !safePreparationActions.has(action)) return false
  if (
    ['bake', 'boil', 'cook', 'roast', 'simmer', 'steam', 'toast'].includes(action) &&
    !['component_cook', 'meal_cook'].includes(candidate.opportunityKind ?? '')
  )
    return false
  if (!candidate.canonicalIngredient?.trim()) return false
  if (!candidate.sourceIngredientId.trim() || candidate.sourceStepIds.length === 0) return false
  if (candidate.maximumLeadTimeHours === null) return false
  return isWorthwhilePreparation(candidate)
}

function isWorthwhilePreparation(candidate: WeeklyPreparationCandidate) {
  const ingredient = candidate.canonicalIngredient?.trim().toLocaleLowerCase('en-AU') ?? ''
  const action = candidate.canonicalAction?.trim().toLocaleLowerCase('en-AU') ?? ''

  // Handling butter on its own does not remove meaningful midweek work. Butter can still be
  // included when it forms part of a source-backed sauce, dough, batter or other component.
  if (ingredient === 'butter' && ['mix', 'whisk'].includes(action)) return false
  return true
}

function isConcisePreparationTitle(title: string) {
  if (title.length > 72 || /[.!?;:]|\s[-–—]\s/.test(title)) return false
  return !looksLikeCookingOrServingInstruction(title)
}

function looksLikeCookingOrServingInstruction(value: string) {
  const normalised = value.toLocaleLowerCase('en-AU')
  return (
    weeklyPreparationQualityRules.rejectedTaskFragments.some((fragment) =>
      normalised.includes(fragment),
    ) ||
    /^\s*(?:remove|serve|set aside)\b/.test(normalised) ||
    /\bbrown (?:the )?(?:beef|chicken|meat|pork)\b/.test(normalised)
  )
}

function preparationTitleFor(candidates: WeeklyPreparationCandidate[]) {
  const ingredients = [
    ...new Set(
      candidates.flatMap((candidate) => {
        const ingredient = candidate.canonicalIngredient?.trim()
        return ingredient ? [ingredient] : []
      }),
    ),
  ]
  const actions = [
    ...new Set(
      candidates.flatMap((candidate) => {
        const action = candidate.canonicalAction?.trim()
        return action ? [action] : []
      }),
    ),
  ]
  const ingredientList = naturalList(ingredients)
  if (ingredients.length === 1 && /\b(marinade|sauce|dressing|paste|pesto)\b/i.test(ingredientList))
    return `Make ${ingredientList}`
  if (actions.length === 1)
    return `${sentenceCase((actions[0] ?? 'prepare').replaceAll('_', ' '))} ${ingredientList}`
  return `Prepare ${ingredientList}`
}

function naturalList(values: string[]) {
  if (values.length === 0) return 'ingredients'
  if (values.length === 1) return values[0] ?? 'ingredients'
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`
}

function preparationHygieneClass(candidate: WeeklyPreparationCandidate) {
  return candidate.boundaries.includes('raw-protein') ||
    candidate.boundaries.includes('cross-contamination')
    ? 'raw-protein'
    : 'clean'
}

function storageGuidanceFor(candidates: WeeklyPreparationCandidate[]) {
  const providerGuidance = [
    ...new Set(
      candidates
        .map((candidate) => candidate.providerStorageGuidance)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  if (providerGuidance.length === 1) return providerGuidance[0]
  if (candidates.every((candidate) => preparationHygieneClass(candidate) === 'raw-protein'))
    return 'Season if required, then refrigerate in a covered container until ready to cook.'
  const references = [...new Set(candidates.map((candidate) => candidate.storageGuidanceReference))]
  if (references.length !== 1) return undefined
  switch (references[0]) {
    case 'refrigerate-potatoes-covered-in-water':
      return 'Store covered in water in the fridge until ready to cook.'
    case 'refrigerate-raw-protein-covered':
      return 'Season if required, then refrigerate in a covered container until ready to cook.'
    case 'refrigerate-prepared-produce-covered':
      return 'Refrigerate in a covered container until ready to use.'
    case 'refrigerate-prepared-component-covered':
      return 'Refrigerate in a covered container until ready to use.'
    default:
      return undefined
  }
}

export function withWeeklyPreparationFallback(
  plan: WeeklyPreparationPlan,
  reason: string,
): WeeklyPreparationPlan {
  return { ...plan, generation: 'fallback', fallbackReason: reason }
}

function partitionByCompatibility(candidates: WeeklyPreparationCandidate[]) {
  const groups = new Map<string, WeeklyPreparationCandidate[]>()
  for (const candidate of candidates) {
    const key = [
      candidate.canonicalAction ?? 'unknown',
      candidate.preparationDetail ?? '',
      candidate.quantity.unit ?? '',
      candidate.maximumLeadTimeHours ?? 'unknown',
      candidate.storageGuidanceReference ?? 'unknown',
      [...candidate.boundaries].sort().join(','),
      candidate.confidence === 'low' || candidate.confidence === 'unknown' ? candidate.id : '',
    ].join('|')
    groups.set(key, [...(groups.get(key) ?? []), candidate])
  }
  return [...groups.values()]
}

function combinedTask(
  category: string,
  candidates: WeeklyPreparationCandidate[],
): WeeklyPreparationTask {
  const first = candidates[0]
  if (!first) throw new Error('empty_candidate_group')
  const quantity = aggregateQuantity(candidates)
  if (!quantity)
    return groupedTask(
      category,
      candidates.map((candidate) => [candidate]),
    )
  const action = first.canonicalAction
  return {
    id: `weekly_task_${stableHash(candidates.map((candidate) => candidate.id).sort())}`,
    title: `${sentenceCase(action ?? 'Prepare')} ${category}`,
    canonicalCategory: category,
    decision: 'combined',
    reasonCode: 'compatible',
    subtasks: [
      {
        id: `weekly_subtask_${stableHash(candidates.map((candidate) => candidate.id).sort())}`,
        title: `${sentenceCase(action ?? 'Prepare')} ${displayQuantity(quantity)} ${category}`,
        canonicalAction: action,
        preparationDetail: first.preparationDetail,
        quantity,
        sources: candidates.map(sourceFor),
      },
    ],
    confidence: lowestConfidence(candidates),
    validation: 'validated',
    storageGuidance: storageGuidanceFor(candidates),
  }
}

function groupedTask(
  category: string,
  partitions: WeeklyPreparationCandidate[][],
): WeeklyPreparationTask {
  const all = partitions.flat()
  const hasBoundary = all.some((candidate) => candidate.boundaries.length > 0)
  return {
    id: `weekly_task_${stableHash(all.map((candidate) => candidate.id).sort())}`,
    title: `Prepare ${category}`,
    canonicalCategory: category,
    decision: 'grouped',
    reasonCode: hasBoundary ? 'safety_boundary' : 'meaningful_preparation_difference',
    subtasks: partitions.map((partition) => {
      const first = partition[0]
      if (!first) throw new Error('empty_candidate_partition')
      const quantity = aggregateQuantity(partition) ?? first.quantity
      return {
        id: `weekly_subtask_${stableHash(partition.map((candidate) => candidate.id).sort())}`,
        title: `${sentenceCase(first.canonicalAction ?? 'Prepare')} ${displayQuantity(quantity)} ${category}`,
        canonicalAction: first.canonicalAction,
        preparationDetail: first.preparationDetail,
        quantity,
        sources: partition.map(sourceFor),
      }
    }),
    confidence: lowestConfidence(all),
    validation: 'validated',
    storageGuidance: storageGuidanceFor(all),
  }
}

function separateTask(
  category: string,
  candidate: WeeklyPreparationCandidate,
): WeeklyPreparationTask {
  const uncertain = !hasUsableIdentity(candidate)
  return {
    id: `weekly_task_${stableHash([candidate.id])}`,
    title: `${sentenceCase(candidate.canonicalAction ?? 'Prepare')} ${category}`,
    canonicalCategory: category,
    decision: 'separate',
    reasonCode:
      candidate.quantity.state === 'unknown'
        ? 'unknown_quantity'
        : uncertain
          ? 'uncertain_metadata'
          : 'meaningful_preparation_difference',
    subtasks: [
      {
        id: `weekly_subtask_${stableHash([candidate.id])}`,
        title: candidate.originalText,
        canonicalAction: candidate.canonicalAction,
        preparationDetail: candidate.preparationDetail,
        quantity: candidate.quantity,
        sources: [sourceFor(candidate)],
      },
    ],
    confidence: candidate.confidence,
    validation: 'validated',
    storageGuidance: storageGuidanceFor([candidate]),
  }
}

function separateCandidatesTask(
  category: string,
  candidates: WeeklyPreparationCandidate[],
): WeeklyPreparationTask {
  const tasks = candidates.map((candidate) => separateTask(category, candidate))
  return {
    id: `weekly_task_${stableHash(candidates.map((candidate) => candidate.id).sort())}`,
    title: `Prepare ${category}`,
    canonicalCategory: category,
    decision: 'separate',
    reasonCode: 'uncertain_metadata',
    subtasks: tasks.flatMap((task) => task.subtasks),
    confidence: lowestConfidence(candidates),
    validation: 'validated',
  }
}

function aggregateQuantity(candidates: WeeklyPreparationCandidate[]) {
  const first = candidates[0]?.quantity
  if (!first || first.state !== 'known' || first.value === null) return null
  if (
    candidates.some(
      (candidate) =>
        candidate.quantity.state !== 'known' ||
        candidate.quantity.value === null ||
        candidate.quantity.unit !== first.unit,
    )
  )
    return null
  return {
    state: 'known' as const,
    value: candidates.reduce((total, candidate) => total + (candidate.quantity.value ?? 0), 0),
    unit: first.unit,
  }
}

function hasUsableIdentity(candidate: WeeklyPreparationCandidate) {
  return Boolean(candidate.canonicalIngredient && candidate.canonicalAction)
}

function sourceFor(candidate: WeeklyPreparationCandidate): WeeklyPreparationSource {
  return {
    id: candidate.id,
    plannedMealId: candidate.plannedMealId,
    recipeId: candidate.recipeId,
    recipeVersionId: candidate.recipeVersionId,
    sourceIngredientId: candidate.sourceIngredientId,
    sourceStepIds: [...candidate.sourceStepIds],
    originalText: candidate.originalText,
    ingredientLines: candidate.ingredientLines,
    instructionSteps: candidate.instructionSteps,
    stoppingPoint: candidate.stoppingPoint,
    finishingGuidance: candidate.finishingGuidance,
    providerStorageGuidance: candidate.providerStorageGuidance,
  }
}

function displayQuantity(quantity: WeeklyPreparationCandidate['quantity']) {
  if (quantity.state !== 'known' || quantity.value === null) return ''
  return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`
}

function lowestConfidence(candidates: WeeklyPreparationCandidate[]): EnrichmentConfidence {
  const order: EnrichmentConfidence[] = ['unknown', 'low', 'medium', 'high']
  return candidates.reduce<EnrichmentConfidence>(
    (lowest, candidate) =>
      order.indexOf(candidate.confidence) < order.indexOf(lowest) ? candidate.confidence : lowest,
    'high',
  )
}

function compareTasks(left: WeeklyPreparationTask, right: WeeklyPreparationTask) {
  return (
    Number(left.reasonCode === 'safety_boundary') -
      Number(right.reasonCode === 'safety_boundary') || left.id.localeCompare(right.id)
  )
}

function sentenceCase(value: string) {
  return value.charAt(0).toLocaleUpperCase('en-AU') + value.slice(1)
}

function stableHash(parts: string[]) {
  let hash = 0x811c9dc5
  for (const character of parts.join('|')) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
