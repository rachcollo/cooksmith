import type { PreparationOpportunity, PreparationOpportunityType } from './preparationOpportunities'

export const getAheadDurationPresets = [15, 30, 45, 60, 120] as const
export const minCustomGetAheadMinutes = 5
export const maxCustomGetAheadMinutes = 240
export const getAheadSessionVersion = 'get-ahead-session-v1' as const
export const getAheadPriorityScoreVersion = 'get-ahead-priority-v1' as const
export const getAheadConsolidationVersion = 'get-ahead-consolidation-v1' as const

export type GetAheadTaskState = 'remaining' | 'completed' | 'skipped' | 'deferred'
export type GetAheadSessionStatus = 'active' | 'ended' | 'completed'
export type GetAheadOverrideKind = 'excluded' | 'included'
export type GetAheadChecklistAction = 'complete' | 'reopen' | 'skip' | 'defer'

export interface GetAheadScoreEvidence {
  version: typeof getAheadPriorityScoreVersion
  score: number
  factors: {
    timeSavedPerMinute: number
    mealsSupported: number
    complexityReduction: number
    freshnessConstraint: 'supported-by-source' | 'not-claimed'
  }
  explanationFactors: string[]
}

export interface GetAheadUserOverrides {
  excludedTaskIds: string[]
  includedTaskIds: string[]
  orderedTaskIds: string[]
}

export interface GetAheadTaskSnapshot {
  id: string
  opportunityId: string
  sourceRuleVersion: string
  type: PreparationOpportunityType
  title: string
  recipeId: string
  recipeName: string
  recipeUpdatedAt: string
  plannedMealId: string
  mealDate: string
  mealType: string
  sourceKind: string
  sourceText: string
  reason: string
  estimatedMinutes: number
  estimatedTimeSavedMinutes: number
  state: GetAheadTaskState
  order: number
  selected: boolean
  consolidation: GetAheadConsolidation | null
  scoreEvidence: GetAheadScoreEvidence
}

export interface GetAheadConsolidationSource {
  opportunityId: string
  recipeName: string
  plannedMealId: string
  mealDate: string
  mealType: string
  sourceText: string
  sourceQuantity: string | null
  sourceUnit: string | null
}

export interface GetAheadConsolidation {
  version: typeof getAheadConsolidationVersion
  signature: string
  displayQuantity: string | null
  displayUnit: string | null
  sources: GetAheadConsolidationSource[]
}

export interface GetAheadSession {
  id: string
  version: typeof getAheadSessionVersion
  scoreVersion: typeof getAheadPriorityScoreVersion
  householdId: string
  planId: string
  weeklyPreparationCacheKey?: string
  selectedMinutes: number
  status: GetAheadSessionStatus
  createdAt: string
  updatedAt: string
  endedAt: string | null
  recommendationExplanation: string
  overrides: GetAheadUserOverrides
  tasks: GetAheadTaskSnapshot[]
}

export interface GetAheadTotals {
  selectedMinutes: number
  plannedMinutes: number
  remainingMinutes: number
  completedMinutes: number
  estimatedTimeSavedMinutes: number
  remainingPotentialMinutes: number
  progressPercent: number
  progressLabel: string
  progressMode: 'duration' | 'task-count'
}

export interface GetAheadTransitionResult {
  session: GetAheadSession
  error: string | null
}

export function validateGetAheadDuration(minutes: number): string | null {
  if (!Number.isInteger(minutes)) return 'Enter a whole number of minutes.'
  if (minutes < minCustomGetAheadMinutes) return 'Choose at least 5 minutes.'
  if (minutes > maxCustomGetAheadMinutes) return 'Choose 240 minutes or less.'
  return null
}

export function taskEstimateMinutes(type: PreparationOpportunityType): number {
  switch (type) {
    case 'chop':
    case 'duplicate-preparation-signal':
      return 10
    case 'sauce':
      return 15
    case 'cook-component':
      return 20
    case 'marinate':
      return 25
    case 'leftover-signal':
    case 'freezer-signal':
      return 5
  }
}

export function taskTimeSavedMinutes(type: PreparationOpportunityType): number {
  const multiplier: Record<PreparationOpportunityType, number> = {
    chop: 1,
    sauce: 1.15,
    marinate: 1.25,
    'cook-component': 1.35,
    'duplicate-preparation-signal': 1.2,
    'leftover-signal': 0.75,
    'freezer-signal': 0.75,
  }
  return Math.max(5, Math.round((taskEstimateMinutes(type) * multiplier[type]) / 5) * 5)
}

export function buildGetAheadTasks(
  opportunities: PreparationOpportunity[],
  selectedMinutes: number,
): GetAheadTaskSnapshot[] {
  const taskPool = consolidateTasks(opportunities)
  const selectedIds = selectTaskIdsForDuration(taskPool, selectedMinutes)
  return orderTasks(taskPool, selectedIds, {
    excludedTaskIds: [],
    includedTaskIds: [],
    orderedTaskIds: [],
  })
}

export function createGetAheadSession(input: {
  householdId: string
  planId: string
  selectedMinutes: number
  opportunities: PreparationOpportunity[]
  weeklyPreparationCacheKey?: string
  now?: Date
}): GetAheadSession {
  const error = validateGetAheadDuration(input.selectedMinutes)
  if (error) throw new Error(error)
  const now = (input.now ?? new Date()).toISOString()
  const tasks = buildGetAheadTasks(input.opportunities, input.selectedMinutes)
  return {
    id: `get_ahead_${input.householdId}_${input.planId}`,
    version: getAheadSessionVersion,
    scoreVersion: getAheadPriorityScoreVersion,
    householdId: input.householdId,
    planId: input.planId,
    ...(input.weeklyPreparationCacheKey
      ? { weeklyPreparationCacheKey: input.weeklyPreparationCacheKey }
      : {}),
    selectedMinutes: input.selectedMinutes,
    status: tasks.some((task) => task.selected) ? 'active' : 'completed',
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    recommendationExplanation: explainRecommendation(tasks),
    overrides: { excludedTaskIds: [], includedTaskIds: [], orderedTaskIds: [] },
    tasks,
  }
}

export function toggleGetAheadTask(
  session: GetAheadSession,
  taskId: string,
  state: GetAheadTaskState,
  now = new Date(),
): GetAheadSession {
  return transitionGetAheadTask(session, taskId, state === 'completed' ? 'complete' : 'reopen', now)
    .session
}

export function transitionGetAheadTask(
  session: GetAheadSession,
  taskId: string,
  action: GetAheadChecklistAction,
  now = new Date(),
): GetAheadTransitionResult {
  const task = session.tasks.find((candidate) => candidate.id === taskId)
  if (!task) return { session, error: 'That task is not available in this session.' }
  const nextState = stateForChecklistAction(action)
  if (!isLegalTaskTransition(task.state, nextState)) {
    return { session, error: `That task cannot move from ${task.state} to ${nextState}.` }
  }
  const overrides = removeOverride(session.overrides, taskId)
  if (nextState === 'skipped' || nextState === 'deferred') overrides.excludedTaskIds.push(taskId)
  const changedTasks = session.tasks.map((candidate) =>
    candidate.id === taskId ? { ...candidate, state: nextState } : candidate,
  )
  const selectedIds = selectWithOverrides(changedTasks, session.selectedMinutes, overrides)
  return {
    session: withUpdatedTasks(
      session,
      orderTasks(changedTasks, selectedIds, overrides),
      now,
      overrides,
    ),
    error: null,
  }
}

export function isLegalTaskTransition(
  current: GetAheadTaskState,
  next: GetAheadTaskState,
): boolean {
  if (current === next) return true
  if (next === 'remaining') return true
  return current === 'remaining'
}

function stateForChecklistAction(action: GetAheadChecklistAction): GetAheadTaskState {
  switch (action) {
    case 'complete':
      return 'completed'
    case 'reopen':
      return 'remaining'
    case 'skip':
      return 'skipped'
    case 'defer':
      return 'deferred'
  }
}

export function applyGetAheadOverride(
  session: GetAheadSession,
  taskId: string,
  kind: GetAheadOverrideKind | 'revert',
  now = new Date(),
): { session: GetAheadSession; conflict: string | null } {
  const task = session.tasks.find((candidate) => candidate.id === taskId)
  if (!task) return { session, conflict: 'That task is not available in this session.' }
  if (task.state === 'completed')
    return { session, conflict: 'Completed task history cannot be rewritten.' }
  const overrides = removeOverride(session.overrides, taskId)
  if (kind === 'excluded') overrides.excludedTaskIds.push(taskId)
  if (kind === 'included') overrides.includedTaskIds.push(taskId)
  const selectedIds = selectWithOverrides(session.tasks, session.selectedMinutes, overrides)
  if (kind === 'included' && !selectedIds.includes(taskId)) {
    return {
      session,
      conflict:
        'That task would exceed your available time. Exclude lower-value work first or choose more time.',
    }
  }
  return { session: withOverrides(session, overrides, selectedIds, now), conflict: null }
}

export function moveGetAheadTask(
  session: GetAheadSession,
  taskId: string,
  direction: 'up' | 'down',
  now = new Date(),
): GetAheadSession {
  const selectedOpenIds = session.tasks
    .filter((task) => task.selected && task.state === 'remaining')
    .sort((a, b) => a.order - b.order)
    .map((task) => task.id)
  const index = selectedOpenIds.indexOf(taskId)
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || swapIndex < 0 || swapIndex >= selectedOpenIds.length) return session
  const orderedTaskIds = [...selectedOpenIds]
  const currentTaskId = orderedTaskIds[index]
  const swapTaskId = orderedTaskIds[swapIndex]
  if (!currentTaskId || !swapTaskId) return session
  orderedTaskIds[index] = swapTaskId
  orderedTaskIds[swapIndex] = currentTaskId
  const overrides = { ...session.overrides, orderedTaskIds }
  const selectedIds = session.tasks.filter((task) => task.selected).map((task) => task.id)
  return withOverrides(session, overrides, selectedIds, now)
}

export function endGetAheadSessionEarly(
  session: GetAheadSession,
  now = new Date(),
): GetAheadSession {
  return { ...session, status: 'ended', endedAt: now.toISOString(), updatedAt: now.toISOString() }
}

export function getAheadTotals(session: GetAheadSession): GetAheadTotals {
  const actionableTasks = session.tasks.filter(
    (task) => task.selected || task.state === 'completed',
  )
  const selectedTasks = session.tasks.filter((task) => task.selected)
  const completedTasks = actionableTasks.filter((task) => task.state === 'completed')
  const plannedMinutes = actionableTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
  const completedMinutes = completedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
  const estimatedTimeSavedMinutes = completedTasks.reduce(
    (sum, task) => sum + task.estimatedTimeSavedMinutes,
    0,
  )
  const remainingPotentialMinutes = selectedTasks
    .filter((task) => task.state === 'remaining')
    .reduce((sum, task) => sum + task.estimatedTimeSavedMinutes, 0)
  const canUseDurationProgress = actionableTasks.every((task) => task.estimatedMinutes > 0)
  const progressPercent = canUseDurationProgress
    ? percentage(completedMinutes, plannedMinutes)
    : percentage(completedTasks.length, actionableTasks.length)
  return {
    selectedMinutes: session.selectedMinutes,
    plannedMinutes,
    remainingMinutes: Math.max(0, session.selectedMinutes - completedMinutes),
    completedMinutes,
    estimatedTimeSavedMinutes,
    remainingPotentialMinutes,
    progressPercent,
    progressLabel: canUseDurationProgress
      ? `${completedMinutes} of ${plannedMinutes} planned prep minutes complete`
      : `${completedTasks.length} of ${actionableTasks.length} tasks complete`,
    progressMode: canUseDurationProgress ? 'duration' : 'task-count',
  }
}

export function isTaskStale(task: GetAheadTaskSnapshot, currentRecipeUpdatedAt: string | null) {
  return currentRecipeUpdatedAt === null || currentRecipeUpdatedAt !== task.recipeUpdatedAt
}

function toTaskSnapshot(opportunity: PreparationOpportunity): GetAheadTaskSnapshot {
  const estimatedMinutes = taskEstimateMinutes(opportunity.type)
  const estimatedTimeSavedMinutes = taskTimeSavedMinutes(opportunity.type)
  return {
    id: `task_${opportunity.id}`,
    opportunityId: opportunity.id,
    sourceRuleVersion: opportunity.ruleVersion,
    type: opportunity.type,
    title: titleForOpportunity(opportunity),
    recipeId: opportunity.recipeId,
    recipeName: opportunity.recipeName,
    recipeUpdatedAt: opportunity.recipeUpdatedAt,
    plannedMealId: opportunity.plannedMealId,
    mealDate: opportunity.mealDate,
    mealType: opportunity.mealType,
    sourceKind: opportunity.source.kind,
    sourceText: opportunity.source.text,
    reason: opportunity.reason,
    estimatedMinutes,
    estimatedTimeSavedMinutes,
    state: 'remaining',
    order: 0,
    selected: false,
    consolidation: null,
    scoreEvidence: scoreOpportunity(opportunity, estimatedMinutes, estimatedTimeSavedMinutes),
  }
}

function consolidateTasks(opportunities: PreparationOpportunity[]): GetAheadTaskSnapshot[] {
  const groups = new Map<string, PreparationOpportunity[]>()
  const singles: PreparationOpportunity[] = []
  for (const opportunity of opportunities) {
    const signature = consolidationSignature(opportunity)
    if (!signature) {
      singles.push(opportunity)
      continue
    }
    groups.set(signature, [...(groups.get(signature) ?? []), opportunity])
  }

  return [
    ...singles.map((opportunity) => toTaskSnapshot(opportunity)),
    ...[...groups.entries()].flatMap(([signature, group]) => {
      const sortedGroup = [...group].sort(compareOpportunitiesById)
      if (sortedGroup.length < 2)
        return sortedGroup.map((opportunity) => toTaskSnapshot(opportunity))
      return [toConsolidatedTask(signature, sortedGroup)]
    }),
  ]
}

function toConsolidatedTask(
  signature: string,
  opportunities: PreparationOpportunity[],
): GetAheadTaskSnapshot {
  const first = opportunities[0]
  if (!first) throw new Error('Cannot consolidate an empty opportunity group.')
  const base = toTaskSnapshot(first)
  const quantity = sumQuantities(opportunities)
  const sources = opportunities.map((opportunity) => ({
    opportunityId: opportunity.id,
    recipeName: opportunity.recipeName,
    plannedMealId: opportunity.plannedMealId,
    mealDate: opportunity.mealDate,
    mealType: opportunity.mealType,
    sourceText: opportunity.source.text,
    sourceQuantity: opportunity.ingredient?.quantity ?? null,
    sourceUnit: opportunity.ingredient?.unit ?? null,
  }))
  const mealsSupported = new Set(opportunities.map((opportunity) => opportunity.plannedMealId)).size
  return {
    ...base,
    id: `task_group_${hashParts([getAheadConsolidationVersion, signature])}`,
    opportunityId: `group_${hashParts([signature])}`,
    title: consolidatedTitle(first, quantity),
    reason: 'Compatible preparation was consolidated across planned meals.',
    estimatedMinutes: Math.max(
      ...opportunities.map((opportunity) => taskEstimateMinutes(opportunity.type)),
    ),
    estimatedTimeSavedMinutes: opportunities.reduce(
      (sum, opportunity) => sum + taskTimeSavedMinutes(opportunity.type),
      0,
    ),
    consolidation: {
      version: getAheadConsolidationVersion,
      signature,
      displayQuantity: quantity?.displayQuantity ?? null,
      displayUnit: quantity?.displayUnit ?? null,
      sources,
    },
    scoreEvidence: {
      ...base.scoreEvidence,
      factors: { ...base.scoreEvidence.factors, mealsSupported },
      explanationFactors: [
        ...base.scoreEvidence.explanationFactors,
        `supports ${mealsSupported} meals`,
      ],
    },
  }
}

function scoreOpportunity(
  opportunity: PreparationOpportunity,
  estimatedMinutes: number,
  estimatedTimeSavedMinutes: number,
): GetAheadScoreEvidence {
  const timeSavedPerMinute = estimatedTimeSavedMinutes / estimatedMinutes
  const mealsSupported = opportunity.type === 'duplicate-preparation-signal' ? 2 : 1
  const complexityReduction = complexityByType[opportunity.type]
  const rawScore = timeSavedPerMinute * 45 + mealsSupported * 15 + complexityReduction * 10
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const explanationFactors = [
    timeSavedPerMinute >= 1.2 ? 'high time saved for the minutes used' : 'practical time saved',
    mealsSupported > 1 ? 'supports more than one preparation step' : null,
    complexityReduction >= 3 ? 'reduces later cooking complexity' : null,
  ].filter((factor): factor is string => Boolean(factor))
  return {
    version: getAheadPriorityScoreVersion,
    score,
    factors: {
      timeSavedPerMinute,
      mealsSupported,
      complexityReduction,
      freshnessConstraint: 'not-claimed',
    },
    explanationFactors,
  }
}

const complexityByType: Record<PreparationOpportunityType, number> = {
  chop: 2,
  sauce: 3,
  marinate: 4,
  'cook-component': 5,
  'duplicate-preparation-signal': 3,
  'leftover-signal': 1,
  'freezer-signal': 1,
}

function selectTaskIdsForDuration(
  tasks: GetAheadTaskSnapshot[],
  selectedMinutes: number,
): string[] {
  return selectWithOverrides(tasks, selectedMinutes, {
    excludedTaskIds: [],
    includedTaskIds: [],
    orderedTaskIds: [],
  })
}

function selectWithOverrides(
  tasks: GetAheadTaskSnapshot[],
  selectedMinutes: number,
  overrides: GetAheadUserOverrides,
): string[] {
  const completedIds = new Set(
    tasks.filter((task) => task.state !== 'remaining').map((task) => task.id),
  )
  const excludedIds = new Set(overrides.excludedTaskIds)
  const selectedIds = new Set<string>()
  let usedMinutes = 0
  overrides.includedTaskIds.forEach((taskId) => {
    const task = tasks.find((candidate) => candidate.id === taskId)
    if (!task || completedIds.has(taskId) || excludedIds.has(taskId)) return
    if (usedMinutes + task.estimatedMinutes <= selectedMinutes) {
      selectedIds.add(taskId)
      usedMinutes += task.estimatedMinutes
    }
  })
  tasks
    .filter(
      (task) =>
        task.state === 'remaining' &&
        !completedIds.has(task.id) &&
        !excludedIds.has(task.id) &&
        !selectedIds.has(task.id),
    )
    .sort(compareTasks)
    .forEach((task) => {
      if (usedMinutes + task.estimatedMinutes <= selectedMinutes) {
        selectedIds.add(task.id)
        usedMinutes += task.estimatedMinutes
      }
    })
  return [...selectedIds]
}

function orderTasks(
  tasks: GetAheadTaskSnapshot[],
  selectedIds: string[],
  overrides: GetAheadUserOverrides,
): GetAheadTaskSnapshot[] {
  const selectedSet = new Set(selectedIds)
  const manualOrder = new Map(overrides.orderedTaskIds.map((taskId, index) => [taskId, index]))
  return tasks
    .map((task) => ({ ...task, selected: selectedSet.has(task.id) }))
    .sort((a, b) => {
      if (a.selected !== b.selected) return a.selected ? -1 : 1
      const manualA = manualOrder.get(a.id)
      const manualB = manualOrder.get(b.id)
      if (manualA !== undefined || manualB !== undefined)
        return (manualA ?? 9999) - (manualB ?? 9999)
      return compareTasks(a, b)
    })
    .map((task, index) => ({ ...task, order: index + 1 }))
}

function compareTasks(a: GetAheadTaskSnapshot, b: GetAheadTaskSnapshot) {
  return (
    b.scoreEvidence.score - a.scoreEvidence.score ||
    b.estimatedTimeSavedMinutes - a.estimatedTimeSavedMinutes ||
    a.estimatedMinutes - b.estimatedMinutes ||
    a.opportunityId.localeCompare(b.opportunityId)
  )
}

function removeOverride(overrides: GetAheadUserOverrides, taskId: string): GetAheadUserOverrides {
  return {
    excludedTaskIds: overrides.excludedTaskIds.filter((id) => id !== taskId),
    includedTaskIds: overrides.includedTaskIds.filter((id) => id !== taskId),
    orderedTaskIds: overrides.orderedTaskIds.filter((id) => id !== taskId),
  }
}

function withOverrides(
  session: GetAheadSession,
  overrides: GetAheadUserOverrides,
  selectedIds: string[],
  now: Date,
) {
  return withUpdatedTasks(
    session,
    orderTasks(session.tasks, selectedIds, overrides),
    now,
    overrides,
  )
}

function withUpdatedTasks(
  session: GetAheadSession,
  tasks: GetAheadTaskSnapshot[],
  now: Date,
  overrides = session.overrides,
): GetAheadSession {
  return {
    ...session,
    tasks,
    overrides,
    recommendationExplanation: explainRecommendation(tasks),
    status: tasks.some((task) => task.selected || task.state === 'completed')
      ? 'active'
      : 'completed',
    updatedAt: now.toISOString(),
  }
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function explainRecommendation(tasks: GetAheadTaskSnapshot[]) {
  const selectedFactors = tasks
    .filter((task) => task.selected)
    .flatMap((task) => task.scoreEvidence.explanationFactors)
  const uniqueFactors = [...new Set(selectedFactors)].slice(0, 3)
  if (uniqueFactors.length === 0)
    return 'No eligible preparation fits this time without unsafe partial work.'
  return `Recommended because these tasks offer ${formatList(uniqueFactors)}.`
}

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? 'practical benefit'
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items[0]}, ${items[1]} and ${items[2]}`
}

function titleForOpportunity(opportunity: PreparationOpportunity) {
  const sourceText = summariseInstruction(opportunity.source.text)
  switch (opportunity.type) {
    case 'chop':
    case 'duplicate-preparation-signal':
      return sentenceCase(
        removeLeadingAction(sourceText, ['chop', 'dice', 'slice', 'mince', 'shred', 'grate']),
      )
    case 'marinate':
      return `Marinate ${removeLeadingAction(sourceText, ['marinate'])}`
    case 'sauce':
      return `Make ${removeLeadingAction(sourceText, ['make', 'prepare', 'mix', 'stir', 'whisk', 'blend'])}`
    case 'cook-component':
      return `Cook ${removeLeadingAction(sourceText, ['cook', 'roast', 'bake', 'boil', 'steam', 'simmer', 'toast'])}`
    case 'leftover-signal':
      return `Set aside ${sourceText}`
    case 'freezer-signal':
      return `Prepare freezer step: ${sourceText}`
  }
}

function summariseInstruction(text: string) {
  return text
    .replace(/^[0-9]+[.)]?\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .replace(/\bfor\s+[A-Z][^,.]{0,40}$/u, '')
    .trim()
    .slice(0, 80)
}

function sentenceCase(text: string) {
  return text.charAt(0).toLocaleUpperCase('en-AU') + text.slice(1)
}

function removeLeadingAction(text: string, verbs: string[]) {
  const pattern = new RegExp(`^(${verbs.join('|')})(?:ed|ing)?\\s+`, 'i')
  return (
    text
      .replace(pattern, '')
      .replace(/^the\s+/i, '')
      .trim() || text
  )
}

function consolidationSignature(opportunity: PreparationOpportunity): string | null {
  if (opportunity.source.kind !== 'ingredient' || opportunity.type !== 'chop') return null
  const ingredient = opportunity.ingredient
  if (!ingredient?.preparation || !ingredient.quantity) return null
  if (quantityToBase(ingredient.quantity, ingredient.unit) === null) return null
  const operation = normalisePreparation(ingredient.preparation)
  const name = normaliseIngredientName(ingredient.name)
  const unit = normaliseUnit(ingredient.unit)
  if (!operation || !name || unit === 'unsupported') return null
  return [
    getAheadConsolidationVersion,
    opportunity.householdId,
    operation,
    name,
    unit.kind,
    unit.unit,
  ].join('|')
}

function consolidatedTitle(
  opportunity: PreparationOpportunity,
  quantity: { displayQuantity: string; displayUnit: string | null } | null,
) {
  const operation = normalisePreparation(opportunity.ingredient?.preparation ?? '') ?? 'Prep'
  const name = sentenceCase(opportunity.ingredient?.name ?? 'ingredients')
  if (!quantity) return `${sentenceCase(operation)} ${name}`
  return `${sentenceCase(operation)} ${quantity.displayQuantity}${quantity.displayUnit ? ` ${quantity.displayUnit}` : ''} ${name}`
}

function normalisePreparation(value: string): string | null {
  const lower = value.trim().toLocaleLowerCase('en-AU')
  if (/\b(dic(?:e|ed|ing))\b/u.test(lower)) return 'dice'
  if (/\b(chopp?ed?|chopping)\b/u.test(lower)) return 'chop'
  if (/\b(slic(?:e|ed|ing))\b/u.test(lower)) return 'slice'
  if (/\b(minc(?:e|ed|ing))\b/u.test(lower)) return 'mince'
  if (/\b(shred(?:ded|ding)?|grated?)\b/u.test(lower)) return 'shred'
  return null
}

function normaliseIngredientName(value: string) {
  return value.trim().toLocaleLowerCase('en-AU').replace(/\s+/gu, ' ').replace(/s$/u, '')
}

type NormalisedUnit =
  | { kind: 'count'; unit: null }
  | { kind: 'metric-weight'; unit: 'g' }
  | { kind: 'metric-volume'; unit: 'ml' }
  | 'unsupported'

function normaliseUnit(unit: string | null): NormalisedUnit {
  if (unit === null || unit.trim() === '') return { kind: 'count', unit: null }
  const lower = unit.trim().toLocaleLowerCase('en-AU')
  if (['g', 'gram', 'grams'].includes(lower)) return { kind: 'metric-weight', unit: 'g' }
  if (['kg', 'kilogram', 'kilograms'].includes(lower)) return { kind: 'metric-weight', unit: 'g' }
  if (['ml', 'millilitre', 'millilitres'].includes(lower))
    return { kind: 'metric-volume', unit: 'ml' }
  if (['l', 'litre', 'litres'].includes(lower)) return { kind: 'metric-volume', unit: 'ml' }
  return 'unsupported'
}

function quantityToBase(quantity: string, unit: string | null): number | null {
  if (!/^\d+(?:\.\d+)?$/u.test(quantity.trim())) return null
  const amount = Number(quantity)
  if (!Number.isFinite(amount)) return null
  const lower = unit?.trim().toLocaleLowerCase('en-AU') ?? ''
  if (['kg', 'kilogram', 'kilograms'].includes(lower)) return amount * 1000
  if (['l', 'litre', 'litres'].includes(lower)) return amount * 1000
  return amount
}

function sumQuantities(
  opportunities: PreparationOpportunity[],
): { displayQuantity: string; displayUnit: string | null } | null {
  const firstUnit = normaliseUnit(opportunities[0]?.ingredient?.unit ?? null)
  if (firstUnit === 'unsupported') return null
  let total = 0
  for (const opportunity of opportunities) {
    const quantity = opportunity.ingredient?.quantity
    if (!quantity) return null
    const amount = quantityToBase(quantity, opportunity.ingredient?.unit ?? null)
    if (amount === null) return null
    total += amount
  }
  return {
    displayQuantity: Number.isInteger(total)
      ? String(total)
      : total.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, ''),
    displayUnit: firstUnit.unit,
  }
}

function compareOpportunitiesById(a: PreparationOpportunity, b: PreparationOpportunity) {
  return a.id.localeCompare(b.id)
}

function hashParts(parts: string[]): string {
  let hash = 0x811c9dc5
  for (const character of parts.join('|')) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}
