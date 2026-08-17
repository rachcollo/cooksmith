import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { useWeeklyPreparationRepository } from '../app/get-ahead/weeklyPreparationContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { FormError } from '../components/ui/FormField'
import { WeeklyPreparationUnavailableError } from '../application/get-ahead/weeklyPreparationRepository'
import type { WeeklyPreparationUnavailableReason } from '../application/get-ahead/weeklyPreparationRepository'
import {
  applyGetAheadOverride,
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadDurationPresets,
  getAheadTotals,
  isTaskStale,
  reconcileGetAheadSession,
  restoreGetAheadSession,
  transitionGetAheadTask,
  validateGetAheadDuration,
  type GetAheadSession,
} from '../domain/get-ahead/session'
import { formatDisplayDate } from '../domain/meal-plans/week'
import {
  periodForPreset,
  validatePreparationPeriod,
  type PreparationPeriodPreset,
} from '../domain/get-ahead/preparationPeriod'
import type { PlannedMeal } from '../domain/meal-plans/types'
import type { Recipe } from '../domain/recipes/types'
import { weeklyPreparationPlanToOpportunities } from '../domain/get-ahead/weeklyPreparationAdapter'
import type { WeeklyPreparationPlan } from '../domain/get-ahead/weeklyPreparationPlan'

const storageKey = (householdId: string, planId: string) =>
  `cooksmith:get-ahead:${householdId}:${planId}`
const durationLabels = new Map<number, string>([
  [15, '15 minutes'],
  [30, '30 minutes'],
  [45, '45 minutes'],
  [60, '1 hour'],
  [120, '2 hours'],
])

export function GetAheadPage() {
  const { state } = useOnboarding()
  const plannedMeals = usePlannedMealRepository()
  const recipes = useRecipeRepository()
  const weeklyPreparation = useWeeklyPreparationRepository()
  const householdId = state.householdId
  const defaultPeriod = useMemo(() => periodForPreset('next-weekdays'), [])
  const [periodPreset, setPeriodPreset] = useState<PreparationPeriodPreset>('next-weekdays')
  const [weekStart, setWeekStart] = useState(defaultPeriod.start)
  const [weekEnd, setWeekEnd] = useState(defaultPeriod.end)
  const planId = `${weekStart}_${weekEnd}`
  const [meals, setMeals] = useState<PlannedMeal[]>([])
  const [recipeList, setRecipeList] = useState<Recipe[]>([])
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [durationError, setDurationError] = useState<string | null>(null)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const [session, setSession] = useState<GetAheadSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPreparationPlan | null>(null)
  const [planUnavailable, setPlanUnavailable] = useState<WeeklyPreparationUnavailableReason | null>(
    null,
  )
  const [planRetrying, setPlanRetrying] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [sessionBeingUpdated, setSessionBeingUpdated] = useState<GetAheadSession | null>(null)
  const [sessionStarting, setSessionStarting] = useState(false)

  useEffect(() => {
    if (!householdId) return
    let active = true
    const key = storageKey(householdId, planId)
    const saved = localStorage.getItem(key)
    const parsed = restoreGetAheadSession(saved)
    if (saved && !parsed) localStorage.removeItem(key)
    Promise.all([
      plannedMeals.listWeek(householdId, weekStart, weekEnd),
      recipes.list(householdId),
      weeklyPreparation
        ?.getCurrentPlan({
          householdId,
          weekStart,
          weekEnd,
          availableMinutes: parsed?.selectedMinutes ?? 30,
        })
        .then((plan) => ({ plan, reason: null }))
        .catch((caught: unknown) => ({
          plan: null,
          reason:
            caught instanceof WeeklyPreparationUnavailableError
              ? caught.reason
              : ('temporarily_unavailable' as const),
        })) ?? Promise.resolve({ plan: null, reason: 'ai_unavailable' as const }),
    ])
      .then(([nextMeals, nextRecipes, preparation]) => {
        if (!active) return
        setMeals(nextMeals)
        setRecipeList(nextRecipes)
        const usablePlan = preparation.plan?.tasks.length ? preparation.plan : null
        setWeeklyPlan(usablePlan)
        setPlanUnavailable(
          preparation.plan && !usablePlan ? 'no_worthwhile_preparation' : preparation.reason,
        )
        if (!usablePlan || usablePlan.generation !== 'model-assisted') {
          localStorage.removeItem(storageKey(householdId, planId))
          setSession(null)
          setShowChecklist(false)
          return
        }
        const fingerprint = sourceFingerprint(nextMeals, nextRecipes)
        const samePlan =
          parsed &&
          parsed.sourceFingerprint === fingerprint &&
          parsed.weeklyPreparationCacheKey === usablePlan.cacheKey
        if (parsed && !samePlan) {
          const reconciled = reconcileGetAheadSession({
            session: parsed,
            planId,
            periodStart: weekStart,
            periodEnd: weekEnd,
            sourceFingerprint: fingerprint,
            selectedMinutes: parsed.selectedMinutes,
            opportunities: opportunitiesFor(nextMeals, nextRecipes, usablePlan),
            weeklyPreparationCacheKey: usablePlan.cacheKey,
          })
          localStorage.setItem(storageKey(householdId, planId), JSON.stringify(reconciled))
          setSession(reconciled)
          setAnnouncement('We updated your session to match your latest meal plan.')
        } else setSession(parsed)
      })
      .catch(() => {
        if (active)
          setError('We could not load your current plan for Get Ahead. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, planId, plannedMeals, recipes, weekEnd, weekStart, weeklyPreparation])

  const visibleSession = session?.householdId === householdId ? session : null

  async function retryWeeklyPlan() {
    if (!weeklyPreparation || !householdId) return
    setPlanRetrying(true)
    try {
      const next = await weeklyPreparation.getCurrentPlan({
        householdId,
        weekStart,
        weekEnd,
        availableMinutes: selectedMinutes,
        forceRetry: true,
      })
      if (next.tasks.length === 0)
        throw new WeeklyPreparationUnavailableError('no_worthwhile_preparation')
      setWeeklyPlan(next)
      setPlanUnavailable(null)
      const opportunities = opportunitiesFor(meals, recipeList, next)
      const existing = visibleSession
      if (existing) {
        const rebuilt = reconcileGetAheadSession({
          session: existing,
          planId,
          periodStart: weekStart,
          periodEnd: weekEnd,
          sourceFingerprint: sourceFingerprint(meals, recipeList),
          selectedMinutes: existing.selectedMinutes,
          opportunities,
          weeklyPreparationCacheKey: next.cacheKey,
        })
        persist(rebuilt)
      }
      setAnnouncement(
        next.generation === 'model-assisted'
          ? 'Your AI-assisted preparation plan is ready.'
          : 'Your usual preparation checklist is ready.',
      )
    } catch (caught) {
      const reason =
        caught instanceof WeeklyPreparationUnavailableError
          ? caught.reason
          : 'temporarily_unavailable'
      setPlanUnavailable(reason)
      setAnnouncement(unavailablePlanCopy(reason).message)
    } finally {
      setPlanRetrying(false)
    }
  }

  function persist(next: GetAheadSession) {
    if (!householdId) return
    localStorage.setItem(storageKey(householdId, planId), JSON.stringify(next))
    setSession(next)
  }

  function updateTask(taskId: string, action: 'complete' | 'reopen') {
    if (!visibleSession) return
    const result = transitionGetAheadTask(visibleSession, taskId, action)
    setOverrideError(result.error)
    if (result.error) return
    persist(result.session)
    const label = result.session.tasks.find((task) => task.id === taskId)?.title ?? 'Task'
    const verb = action === 'complete' ? 'completed' : 'reopened'
    setAnnouncement(`${label} ${verb}.`)
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateGetAheadDuration(selectedMinutes)
    const nextPeriodError = validatePreparationPeriod({ start: weekStart, end: weekEnd })
    setDurationError(error)
    setPeriodError(nextPeriodError)
    if (error || nextPeriodError || !householdId) return
    if (sessionStarting) return
    setSessionStarting(true)
    let planForSession = weeklyPlan
    let currentMeals = meals
    let currentRecipes = recipeList
    try {
      if (weeklyPreparation) {
        ;[currentMeals, currentRecipes] = await Promise.all([
          plannedMeals.listWeek(householdId, weekStart, weekEnd),
          recipes.list(householdId),
        ])
        setMeals(currentMeals)
        setRecipeList(currentRecipes)
        planForSession = await weeklyPreparation.getCurrentPlan({
          householdId,
          weekStart,
          weekEnd,
          availableMinutes: selectedMinutes,
        })
        if (planForSession.tasks.length === 0)
          throw new WeeklyPreparationUnavailableError('no_worthwhile_preparation')
        setWeeklyPlan(planForSession)
        setPlanUnavailable(null)
      }
    } catch (caught) {
      const reason =
        caught instanceof WeeklyPreparationUnavailableError
          ? caught.reason
          : 'temporarily_unavailable'
      setPlanUnavailable(reason)
      setAnnouncement(unavailablePlanCopy(reason).message)
      return
    } finally {
      setSessionStarting(false)
    }
    const sessionInput = {
      householdId,
      planId,
      periodStart: weekStart,
      periodEnd: weekEnd,
      sourceFingerprint: sourceFingerprint(currentMeals, currentRecipes),
      selectedMinutes,
      opportunities: opportunitiesFor(currentMeals, currentRecipes, planForSession),
      weeklyPreparationCacheKey: planForSession?.cacheKey,
    }
    const previousSession = sessionBeingUpdated ?? visibleSession
    const next = previousSession
      ? reconcileGetAheadSession({ ...sessionInput, session: previousSession })
      : createGetAheadSession(sessionInput)
    persist(next)
    setShowChecklist(true)
    setEditingPlan(false)
    setSessionBeingUpdated(null)
    setAnnouncement(
      `Get Ahead session created with ${next.tasks.filter((task) => task.selected).length} tasks.`,
    )
  }

  function updatePeriodPreset(event: ChangeEvent<HTMLSelectElement>) {
    const preset = event.target.value as PreparationPeriodPreset
    if (visibleSession) setSessionBeingUpdated(visibleSession)
    setPeriodPreset(preset)
    if (preset !== 'custom') {
      const period = periodForPreset(preset)
      setWeekStart(period.start)
      setWeekEnd(period.end)
      setPeriodError(null)
    }
  }

  function updatePreset(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === 'custom') {
      setCustomMinutes(String(selectedMinutes))
      return
    }
    const next = Number(event.target.value)
    setCustomMinutes('')
    setSelectedMinutes(next)
    setDurationError(null)
  }

  function updateCustom(event: ChangeEvent<HTMLInputElement>) {
    setCustomMinutes(event.target.value)
    const next = Number(event.target.value)
    setSelectedMinutes(next)
    setDurationError(validateGetAheadDuration(next))
  }

  if (loading) return <LoadingState label="Loading Get Ahead" />
  if (error) return <ErrorState title="Get Ahead is unavailable" message={error} />

  return (
    <>
      <DocumentTitle title="Get Ahead" />
      <header className="page-header compact-page-header get-ahead-page-header">
        <div className="page-header-copy">
          <h1>How much prep time do you have today?</h1>
        </div>
      </header>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {weeklyPlan?.generation === 'model-assisted' ? (
        <p className="get-ahead-guidance-note" role="status">
          AI-assisted plan
        </p>
      ) : planUnavailable ? (
        <PlanUnavailablePanel
          reason={planUnavailable}
          retrying={planRetrying}
          onRetry={() => void retryWeeklyPlan()}
        />
      ) : (
        <p className="get-ahead-guidance-note" role="status">
          Choose your meals and available time to create a preparation plan.
        </p>
      )}
      {!visibleSession || !showChecklist || editingPlan ? (
        <Panel className="flow-stack get-ahead-session-picker">
          {visibleSession ? (
            <div className="resume-session-card">
              <div>
                <strong>Prep session waiting</strong>
                <p>Resume where you left off, or update the dates or available time below.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowChecklist(true)
                  setEditingPlan(false)
                }}
              >
                Resume
              </Button>
            </div>
          ) : null}
          <div className="flow-stack preparation-period-fields">
            <label htmlFor="preparation-period">
              Which meals are you preparing for?
              <select id="preparation-period" value={periodPreset} onChange={updatePeriodPreset}>
                <option value="next-weekdays">Next Monday to Friday</option>
                <option value="this-week">This week</option>
                <option value="next-week">Next week</option>
                <option value="custom">Choose dates</option>
              </select>
            </label>
            {periodPreset === 'custom' ? (
              <div className="preparation-date-range">
                <label htmlFor="preparation-start">
                  From
                  <input
                    id="preparation-start"
                    type="date"
                    value={weekStart}
                    onChange={(event) => {
                      if (visibleSession) setSessionBeingUpdated(visibleSession)
                      setWeekStart(event.target.value)
                      setPeriodError(null)
                    }}
                  />
                </label>
                <label htmlFor="preparation-end">
                  To
                  <input
                    id="preparation-end"
                    type="date"
                    value={weekEnd}
                    onChange={(event) => {
                      if (visibleSession) setSessionBeingUpdated(visibleSession)
                      setWeekEnd(event.target.value)
                      setPeriodError(null)
                    }}
                  />
                </label>
              </div>
            ) : null}
            <p className="get-ahead-period-summary">
              Preparing for {formatPeriod(weekStart, weekEnd)}
            </p>
            {periodError ? (
              <FormError id="preparation-period-error">{periodError}</FormError>
            ) : null}
          </div>
          <form className="duration-inline-form" onSubmit={startSession}>
            <label className="duration-select-label" htmlFor="duration-preset">
              <span className="sr-only">Preset duration</span>
              <select
                id="duration-preset"
                value={customMinutes ? 'custom' : selectedMinutes}
                onChange={updatePreset}
              >
                {getAheadDurationPresets.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {durationLabels.get(minutes)}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="custom-duration-label" htmlFor="custom-duration">
              <span className="sr-only">Custom minutes</span>
              <input
                id="custom-duration"
                aria-describedby={durationError ? 'custom-duration-error' : undefined}
                aria-invalid={Boolean(durationError)}
                inputMode="numeric"
                min={5}
                max={240}
                placeholder="Mins"
                step={1}
                type="number"
                value={customMinutes}
                onChange={updateCustom}
              />
            </label>
            <Button variant="accent" type="submit" disabled={sessionStarting}>
              {sessionStarting ? 'Planning…' : visibleSession ? 'Update plan' : 'Start'}
            </Button>
            {durationError ? (
              <FormError id="custom-duration-error">{durationError}</FormError>
            ) : null}
          </form>
        </Panel>
      ) : (
        <Panel className="flow-stack get-ahead-session">
          <GetAheadProgressSummary session={visibleSession} />
          <p className="get-ahead-period-summary">
            Preparing for{' '}
            {formatPeriod(
              visibleSession.periodStart ?? weekStart,
              visibleSession.periodEnd ?? weekEnd,
            )}{' '}
            · {visibleSession.selectedMinutes} minutes available
          </p>
          {visibleSession.tasks.filter((task) => task.selected || task.state === 'completed')
            .length === 0 ? (
            <EmptyState
              title="No preparation tasks found"
              message="Your current plan has no supported Get Ahead opportunities yet."
            />
          ) : null}
          {overrideError ? (
            <FormError id="get-ahead-override-error">{overrideError}</FormError>
          ) : null}
          <ul className="plain-list flow-stack" aria-label="Prep checklist">
            {visibleSession.tasks
              .filter((task) => task.selected || task.state === 'completed')
              .map((task) => {
                const currentRecipe =
                  recipeList.find((recipe) => recipe.id === task.recipeId) ?? null
                const stale = isTaskStale(task, currentRecipe?.updatedAt ?? null)
                return (
                  <GetAheadTaskRow
                    key={task.id}
                    task={task}
                    stale={stale}
                    onToggle={(checked) => updateTask(task.id, checked ? 'complete' : 'reopen')}
                  />
                )
              })}
          </ul>
          {visibleSession.tasks.some((task) => !task.selected) ? (
            <div className="flow-stack">
              <h2>Eligible alternatives</h2>
              <ul className="plain-list flow-stack">
                {visibleSession.tasks
                  .filter((task) => !task.selected)
                  .map((task) => (
                    <li className="task-row" key={task.id}>
                      <span>
                        <strong>{task.title}</strong>
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const result = applyGetAheadOverride(visibleSession, task.id, 'included')
                          setOverrideError(result.conflict)
                          persist(result.session)
                        }}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <div className="cluster">
            <Button
              variant="secondary"
              onClick={() => {
                persist(endGetAheadSessionEarly(visibleSession))
                setShowChecklist(false)
              }}
            >
              End early
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setSelectedMinutes(visibleSession.selectedMinutes)
                setSessionBeingUpdated(visibleSession)
                setEditingPlan(true)
                setShowChecklist(false)
              }}
            >
              Update plan
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

function opportunitiesFor(
  meals: PlannedMeal[],
  recipes: Recipe[],
  plan: WeeklyPreparationPlan | null,
) {
  if (!plan || plan.generation !== 'model-assisted') return []
  const consolidated = weeklyPreparationPlanToOpportunities(plan, meals, recipes)
  return consolidated
}

function sourceFingerprint(meals: PlannedMeal[], recipes: Recipe[]) {
  const recipeVersions = new Map(recipes.map((recipe) => [recipe.id, recipe.updatedAt]))
  return meals
    .map(
      (meal) =>
        `${meal.id}:${meal.mealDate}:${meal.recipeId ?? ''}:${meal.updatedAt}:${recipeVersions.get(meal.recipeId ?? '') ?? ''}`,
    )
    .sort()
    .join('|')
}

function formatPeriod(start: string, end: string) {
  return start === end
    ? formatDisplayDate(start)
    : `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`
}

function GetAheadProgressSummary({ session }: { session: GetAheadSession }) {
  const totals = getAheadTotals(session)
  return (
    <div className="flow-stack get-ahead-progress" aria-label="Get Ahead progress summary">
      <div className="cluster">
        <Sparkles aria-hidden="true" />
        <strong>{totals.estimatedTimeSavedMinutes} minutes saved this week</strong>
        <span>{totals.remainingMinutes} minutes of prep time remaining.</span>
      </div>
      <progress aria-label="Prep progress" max={100} value={totals.progressPercent} />
      <p>{totals.progressLabel}.</p>
      {totals.plannedMinutes < totals.selectedMinutes ? (
        <p>
          Cooksmith found {totals.plannedMinutes} minutes of useful preparation for the time you
          selected.
        </p>
      ) : null}
    </div>
  )
}

function GetAheadTaskRow({
  task,
  stale,
  onToggle,
}: {
  task: GetAheadSession['tasks'][number]
  stale: boolean
  onToggle: (checked: boolean) => void
}) {
  const completed = task.state === 'completed'
  return (
    <li className={completed ? 'task-row task-row-completed' : 'task-row'}>
      <label>
        <input
          type="checkbox"
          checked={completed}
          disabled={stale}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="task-row-title">
          <strong>{task.title}</strong>
          {task.storageGuidance ? <span>{task.storageGuidance}</span> : null}
          {task.consolidation && task.consolidation.sources.length > 1 ? (
            <small>
              Helps with{' '}
              {[...new Set(task.consolidation.sources.map((source) => source.recipeName))].join(
                ' and ',
              )}
              .
            </small>
          ) : (
            <small>For {task.recipeName}.</small>
          )}
          {stale ? (
            <small role="status">Source changed since this session was created.</small>
          ) : null}
        </span>
      </label>
      {task.taskDetails?.length ? (
        <details className="task-row-details">
          <summary>Show what to do</summary>
          <ol>
            {task.taskDetails.map((detail) => (
              <li key={detail.id}>
                <strong>
                  {detail.recipeNames?.length ? detail.recipeNames.join(' and ') : task.recipeName}
                </strong>
                {detail.ingredients?.length ? (
                  <div>
                    <span>Ingredients</span>
                    <ul>
                      {detail.ingredients.map((ingredient) => (
                        <li key={ingredient}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                ) : detail.quantity ? (
                  <span>Quantity: {detail.quantity}</span>
                ) : null}
                {detail.steps?.length ? (
                  <div>
                    <span>Steps</span>
                    <ol>
                      {detail.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <span>{detail.instruction}</span>
                )}
                {detail.stoppingPoint ? (
                  <p>
                    <strong>Stop when:</strong> {detail.stoppingPoint}
                  </p>
                ) : null}
                {detail.finishingGuidance ? (
                  <p>
                    <strong>On the night:</strong> {detail.finishingGuidance}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </li>
  )
}

function unavailablePlanCopy(reason: WeeklyPreparationUnavailableReason) {
  switch (reason) {
    case 'no_planned_meals':
      return {
        title: 'No meals planned for these dates',
        message: 'Add meals to your plan, then come back to create your prep session.',
        retryable: false,
      }
    case 'recipes_preparing':
      return {
        title: 'Recipe insights are still being prepared',
        message: 'Cooksmith is preparing the recipe details needed for a useful plan.',
        retryable: true,
      }
    case 'recipes_without_opportunities':
      return {
        title: 'Some recipes need better prep insights',
        message: 'Cooksmith is repairing those recipe insights before creating your plan.',
        retryable: true,
      }
    case 'opportunities_not_ready_yet':
      return {
        title: 'This prep is better done closer to cooking day',
        message:
          'Cooksmith found useful steps, but storing them from today would reduce quality or safety. Your meals are still ready to plan closer to their cooking dates.',
        retryable: false,
      }
    case 'no_worthwhile_preparation':
      return {
        title: 'No worthwhile prep fits this session',
        message:
          'Cooksmith found no useful preparation that fits the selected time and current meal dates. Try a different duration or closer to the meal dates.',
        retryable: false,
      }
    default:
      return {
        title: 'We could not create your prep plan',
        message: 'Your meals are unchanged. Try again to create a fresh plan.',
        retryable: true,
      }
  }
}

function PlanUnavailablePanel({
  reason,
  retrying,
  onRetry,
}: {
  reason: WeeklyPreparationUnavailableReason
  retrying: boolean
  onRetry: () => void
}) {
  const copy = unavailablePlanCopy(reason)
  return (
    <section className="get-ahead-status-panel flow-stack" role="status">
      <div>
        <strong>{copy.title}</strong>
        <p>{copy.message}</p>
      </div>
      {copy.retryable ? (
        <Button variant="secondary" disabled={retrying} onClick={onRetry}>
          {retrying ? 'Trying again…' : 'Try again'}
        </Button>
      ) : null}
    </section>
  )
}
