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
import { analysePreparationOpportunities } from '../domain/get-ahead/preparationOpportunities'
import {
  applyGetAheadOverride,
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadDurationPresets,
  getAheadTotals,
  isTaskStale,
  transitionGetAheadTask,
  validateGetAheadDuration,
  type GetAheadSession,
} from '../domain/get-ahead/session'
import { addDays, currentWeek } from '../domain/meal-plans/week'
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
  const weekStart = currentWeek(new Date())
  const weekEnd = addDays(weekStart, 6)
  const planId = `${weekStart}_${weekEnd}`
  const [meals, setMeals] = useState<PlannedMeal[]>([])
  const [recipeList, setRecipeList] = useState<Recipe[]>([])
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [durationError, setDurationError] = useState<string | null>(null)
  const [session, setSession] = useState<GetAheadSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPreparationPlan | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [planRetrying, setPlanRetrying] = useState(false)

  useEffect(() => {
    if (!householdId) return
    let active = true
    Promise.all([
      plannedMeals.listWeek(householdId, weekStart, weekEnd),
      recipes.list(householdId),
      weeklyPreparation
        ?.getCurrentPlan({ householdId, weekStart, weekEnd })
        .then((plan) => ({ plan, unavailable: false }))
        .catch(() => ({ plan: null, unavailable: true })) ??
        Promise.resolve({ plan: null, unavailable: true }),
    ])
      .then(([nextMeals, nextRecipes, preparation]) => {
        if (!active) return
        setMeals(nextMeals)
        setRecipeList(nextRecipes)
        setWeeklyPlan(preparation.plan)
        setUsingFallback(preparation.unavailable)
        const saved = localStorage.getItem(storageKey(householdId, planId))
        const parsed = saved ? (JSON.parse(saved) as GetAheadSession) : null
        const samePlan =
          !preparation.plan ||
          !parsed?.weeklyPreparationCacheKey ||
          parsed.weeklyPreparationCacheKey === preparation.plan.cacheKey
        setSession(samePlan ? parsed : null)
        if (!samePlan)
          setAnnouncement(
            'Your weekly preparation guidance changed, so Cooksmith is ready to make a fresh checklist.',
          )
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

  const opportunities = useMemo(() => {
    const deterministic = analysePreparationOpportunities(
      meals.map((plannedMeal) => ({
        plannedMeal,
        recipe: recipeList.find((recipe) => recipe.id === plannedMeal.recipeId) ?? null,
      })),
    )
    if (!weeklyPlan) return deterministic
    const consolidated = weeklyPreparationPlanToOpportunities(weeklyPlan, meals, recipeList)
    return consolidated.length > 0 ? consolidated : deterministic
  }, [meals, recipeList, weeklyPlan])

  const visibleSession = session?.householdId === householdId ? session : null

  async function retryWeeklyPlan() {
    if (!weeklyPreparation || !householdId) return
    setPlanRetrying(true)
    try {
      const next = await weeklyPreparation.getCurrentPlan({
        householdId,
        weekStart,
        weekEnd,
        forceRetry: true,
      })
      setWeeklyPlan(next)
      setUsingFallback(next.generation === 'fallback')
      setAnnouncement(
        next.generation === 'model-assisted'
          ? 'Your AI-assisted preparation plan is ready.'
          : 'Your usual preparation checklist is ready.',
      )
    } catch {
      setAnnouncement(
        'Cooksmith could not refresh the preparation plan. Your usual checklist is still available.',
      )
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

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateGetAheadDuration(selectedMinutes)
    setDurationError(error)
    if (error || !householdId) return
    const next = createGetAheadSession({
      householdId,
      planId,
      selectedMinutes,
      opportunities,
      weeklyPreparationCacheKey: weeklyPlan?.cacheKey,
    })
    persist(next)
    setShowChecklist(true)
    setAnnouncement(
      `Get Ahead session created with ${next.tasks.filter((task) => task.selected).length} tasks.`,
    )
  }

  function startFresh() {
    if (!window.confirm('Start fresh and replace this unfinished Get Ahead session?')) return
    const next = createGetAheadSession({
      householdId: householdId ?? '',
      planId,
      selectedMinutes,
      opportunities,
      weeklyPreparationCacheKey: weeklyPlan?.cacheKey,
    })
    persist(next)
    setShowChecklist(true)
    setAnnouncement('Fresh Get Ahead session started.')
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
      ) : usingFallback || weeklyPlan?.generation === 'fallback' ? (
        <p className="get-ahead-guidance-note" role="status">
          Cooksmith is using a temporary fallback. Your usual preparation checklist is still
          available.
          <Button
            variant="secondary"
            disabled={planRetrying}
            onClick={() => void retryWeeklyPlan()}
          >
            {planRetrying ? 'Trying again…' : 'Try again'}
          </Button>
        </p>
      ) : (
        <p className="get-ahead-guidance-note" role="status">
          Usual preparation checklist
        </p>
      )}
      {!visibleSession || visibleSession.status !== 'active' || !showChecklist ? (
        <Panel className="flow-stack get-ahead-session-picker">
          {visibleSession?.status === 'active' ? (
            <div className="resume-session-card">
              <div>
                <strong>Prep session waiting</strong>
                <p>
                  Resume where you left off, or choose more time below and Cooksmith will replan the
                  session.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setShowChecklist(true)}>
                Resume
              </Button>
            </div>
          ) : null}
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
            <Button variant="accent" type="submit">
              Start
            </Button>
            {durationError ? (
              <FormError id="custom-duration-error">{durationError}</FormError>
            ) : null}
          </form>
        </Panel>
      ) : (
        <Panel className="flow-stack get-ahead-session">
          <GetAheadProgressSummary session={visibleSession} />
          {visibleSession.tasks.filter((task) => task.selected || task.state === 'completed')
            .length === 0 ? (
            <EmptyState
              title="No preparation tasks found"
              message="Your current plan has no supported Get Ahead opportunities yet."
            />
          ) : null}
          <p>{visibleSession.recommendationExplanation}</p>
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
              onClick={() => persist(endGetAheadSessionEarly(visibleSession))}
            >
              End early
            </Button>
            <Button variant="quiet" onClick={startFresh}>
              Start fresh
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

function GetAheadProgressSummary({ session }: { session: GetAheadSession }) {
  const totals = getAheadTotals(session)
  return (
    <div className="flow-stack get-ahead-progress" aria-label="Get Ahead progress summary">
      <div className="cluster">
        <Sparkles aria-hidden="true" />
        <strong>{totals.estimatedTimeSavedMinutes} minutes saved this week</strong>
        <span>{totals.remainingPotentialMinutes} minutes still possible.</span>
      </div>
      <progress aria-label="Prep progress" max={100} value={totals.progressPercent} />
      <p>{totals.progressLabel}.</p>
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
          <small>{task.reason}</small>
          {task.consolidation && task.consolidation.sources.length > 1 ? (
            <small>
              Helps with{' '}
              {[...new Set(task.consolidation.sources.map((source) => source.recipeName))].join(
                ' and ',
              )}
              .
            </small>
          ) : null}
          {stale ? (
            <small role="status">Source changed since this session was created.</small>
          ) : null}
        </span>
      </label>
    </li>
  )
}
