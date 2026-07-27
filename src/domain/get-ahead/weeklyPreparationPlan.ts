import type { EnrichmentConfidence, QuantityState } from '../recipes/intelligence'

export const weeklyPreparationPlanSchemaVersion = 'weekly-preparation-plan-v1' as const
export const weeklyPreparationPlannerVersion = 'weekly-preparation-planner-v1' as const

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
>

export type WeeklyPreparationSubtask = {
  id: string
  title: string
  canonicalAction: string | null
  preparationDetail: string | null
  quantity: WeeklyPreparationCandidate['quantity']
  sources: WeeklyPreparationSource[]
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
  groups: Array<{
    candidateIds: string[]
    decision: 'combined' | 'grouped' | 'separate'
  }>
}

export function createWeeklyPreparationCacheKey(candidates: WeeklyPreparationCandidate[]) {
  return stableHash(
    candidates
      .map((candidate) =>
        [
          candidate.planId,
          candidate.plannedMealId,
          candidate.recipeId,
          candidate.recipeVersionId,
          candidate.enrichmentVersion,
          candidate.servings,
          candidate.sourceIngredientId,
          candidate.quantity.state,
          candidate.quantity.value ?? 'unknown',
          candidate.quantity.unit ?? 'unknown',
        ].join(':'),
      )
      .sort(),
  )
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
  for (const candidate of candidates) {
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
): { ok: true; value: WeeklyPreparationPlan } | { ok: false; reason: string } {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const allowed = new Set(fallback.ambiguousCandidateIds)
  const used = new Set<string>()
  const replacementTasks: WeeklyPreparationTask[] = []
  for (const group of decision.groups) {
    if (group.candidateIds.length === 0) return { ok: false, reason: 'empty_group' }
    for (const id of group.candidateIds) {
      if (!allowed.has(id) || !byId.has(id) || used.has(id))
        return { ok: false, reason: 'unsupported_reference' }
      used.add(id)
    }
    if (group.decision === 'combined') {
      const supplied = group.candidateIds.flatMap((id) => byId.get(id) ?? [])
      if (partitionByCompatibility(supplied).length !== 1)
        return { ok: false, reason: 'unsafe_combination' }
    }
    const supplied = group.candidateIds.flatMap((id) => byId.get(id) ?? [])
    const category = supplied[0]?.canonicalIngredient
    if (!category || supplied.some((candidate) => candidate.canonicalIngredient !== category))
      return { ok: false, reason: 'unsupported_grouping' }
    replacementTasks.push(
      group.decision === 'combined'
        ? combinedTask(category, supplied)
        : group.decision === 'grouped'
          ? groupedTask(category, partitionByCompatibility(supplied))
          : separateCandidatesTask(category, supplied),
    )
  }
  if (used.size !== allowed.size) return { ok: false, reason: 'incomplete_decision' }
  const retained = fallback.tasks.filter(
    (task) =>
      !task.subtasks.some((subtask) => subtask.sources.some((source) => used.has(source.id))),
  )
  return {
    ok: true,
    value: {
      ...fallback,
      tasks: [...retained, ...replacementTasks].sort(compareTasks),
      generation: 'model-assisted',
      fallbackReason: null,
    },
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
