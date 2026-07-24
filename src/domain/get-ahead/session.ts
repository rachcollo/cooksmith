import type { PreparationOpportunity, PreparationOpportunityType } from './preparationOpportunities'

export const getAheadDurationPresets = [15, 30, 45, 60, 120] as const
export const minCustomGetAheadMinutes = 5
export const maxCustomGetAheadMinutes = 240
export const getAheadSessionVersion = 'get-ahead-session-v1' as const

export type GetAheadTaskState = 'open' | 'completed'
export type GetAheadSessionStatus = 'active' | 'ended' | 'completed'

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
}

export interface GetAheadSession {
  id: string
  version: typeof getAheadSessionVersion
  householdId: string
  planId: string
  selectedMinutes: number
  status: GetAheadSessionStatus
  createdAt: string
  updatedAt: string
  endedAt: string | null
  tasks: GetAheadTaskSnapshot[]
}

export interface GetAheadTotals {
  selectedMinutes: number
  plannedMinutes: number
  remainingMinutes: number
  completedMinutes: number
  estimatedTimeSavedMinutes: number
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
  return Math.max(5, Math.round((taskEstimateMinutes(type) * 0.75) / 5) * 5)
}

export function buildGetAheadTasks(
  opportunities: PreparationOpportunity[],
  selectedMinutes: number,
): GetAheadTaskSnapshot[] {
  let usedMinutes = 0
  const tasks: GetAheadTaskSnapshot[] = []

  opportunities.forEach((opportunity) => {
    const estimatedMinutes = taskEstimateMinutes(opportunity.type)
    if (usedMinutes + estimatedMinutes > selectedMinutes) return
    usedMinutes += estimatedMinutes
    tasks.push({
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
      estimatedTimeSavedMinutes: taskTimeSavedMinutes(opportunity.type),
      state: 'open',
      order: tasks.length + 1,
    })
  })

  return tasks
}

export function createGetAheadSession(input: {
  householdId: string
  planId: string
  selectedMinutes: number
  opportunities: PreparationOpportunity[]
  now?: Date
}): GetAheadSession {
  const error = validateGetAheadDuration(input.selectedMinutes)
  if (error) throw new Error(error)
  const now = (input.now ?? new Date()).toISOString()
  const tasks = buildGetAheadTasks(input.opportunities, input.selectedMinutes)
  return {
    id: `get_ahead_${input.householdId}_${input.planId}`,
    version: getAheadSessionVersion,
    householdId: input.householdId,
    planId: input.planId,
    selectedMinutes: input.selectedMinutes,
    status: tasks.length === 0 ? 'completed' : 'active',
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    tasks,
  }
}

export function toggleGetAheadTask(
  session: GetAheadSession,
  taskId: string,
  state: GetAheadTaskState,
  now = new Date(),
): GetAheadSession {
  const tasks = session.tasks.map((task) => (task.id === taskId ? { ...task, state } : task))
  return {
    ...session,
    tasks,
    status:
      tasks.length > 0 && tasks.every((task) => task.state === 'completed')
        ? 'completed'
        : 'active',
    updatedAt: now.toISOString(),
  }
}

export function endGetAheadSessionEarly(
  session: GetAheadSession,
  now = new Date(),
): GetAheadSession {
  return { ...session, status: 'ended', endedAt: now.toISOString(), updatedAt: now.toISOString() }
}

export function getAheadTotals(session: GetAheadSession): GetAheadTotals {
  const plannedMinutes = session.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
  const completedMinutes = session.tasks
    .filter((task) => task.state === 'completed')
    .reduce((sum, task) => sum + task.estimatedMinutes, 0)
  const estimatedTimeSavedMinutes = session.tasks
    .filter((task) => task.state === 'completed')
    .reduce((sum, task) => sum + task.estimatedTimeSavedMinutes, 0)
  return {
    selectedMinutes: session.selectedMinutes,
    plannedMinutes,
    remainingMinutes: Math.max(0, session.selectedMinutes - completedMinutes),
    completedMinutes,
    estimatedTimeSavedMinutes,
  }
}

export function isTaskStale(task: GetAheadTaskSnapshot, currentRecipeUpdatedAt: string | null) {
  return currentRecipeUpdatedAt === null || currentRecipeUpdatedAt !== task.recipeUpdatedAt
}

function titleForOpportunity(opportunity: PreparationOpportunity) {
  const source = opportunity.source.kind === 'ingredient' ? 'ingredient prep' : 'recipe step'
  return `Prepare ${source} for ${opportunity.recipeName}`
}
