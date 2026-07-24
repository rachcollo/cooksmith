import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextField } from '../components/ui/TextField'
import { analysePreparationOpportunities } from '../domain/get-ahead/preparationOpportunities'
import {
  createGetAheadSession,
  endGetAheadSessionEarly,
  getAheadDurationPresets,
  getAheadTotals,
  isTaskStale,
  toggleGetAheadTask,
  validateGetAheadDuration,
  type GetAheadSession,
} from '../domain/get-ahead/session'
import { addDays, currentWeek, formatDisplayDate } from '../domain/meal-plans/week'
import type { PlannedMeal } from '../domain/meal-plans/types'
import type { Recipe } from '../domain/recipes/types'

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

  useEffect(() => {
    if (!householdId) return
    let active = true
    Promise.all([plannedMeals.listWeek(householdId, weekStart, weekEnd), recipes.list(householdId)])
      .then(([nextMeals, nextRecipes]) => {
        if (!active) return
        setMeals(nextMeals)
        setRecipeList(nextRecipes)
        const saved = localStorage.getItem(storageKey(householdId, planId))
        setSession(saved ? (JSON.parse(saved) as GetAheadSession) : null)
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
  }, [householdId, planId, plannedMeals, recipes, weekEnd, weekStart])

  const opportunities = useMemo(() => {
    return analysePreparationOpportunities(
      meals.map((plannedMeal) => ({
        plannedMeal,
        recipe: recipeList.find((recipe) => recipe.id === plannedMeal.recipeId) ?? null,
      })),
    )
  }, [meals, recipeList])

  const visibleSession = session?.householdId === householdId ? session : null

  function persist(next: GetAheadSession) {
    if (!householdId) return
    localStorage.setItem(storageKey(householdId, planId), JSON.stringify(next))
    setSession(next)
  }

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateGetAheadDuration(selectedMinutes)
    setDurationError(error)
    if (error || !householdId) return
    const next = createGetAheadSession({ householdId, planId, selectedMinutes, opportunities })
    persist(next)
    setAnnouncement(`Get Ahead session created with ${next.tasks.length} tasks.`)
  }

  function startFresh() {
    if (!window.confirm('Start fresh and replace this unfinished Get Ahead session?')) return
    const next = createGetAheadSession({
      householdId: householdId ?? '',
      planId,
      selectedMinutes,
      opportunities,
    })
    persist(next)
    setAnnouncement('Fresh Get Ahead session started.')
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
      <PageHeader
        eyebrow="Get Ahead"
        title="How much time do you have today?"
        description="Choose a calm preparation session for this week’s planned dinners. Estimates are guides, not food-safety guarantees."
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {!visibleSession || visibleSession.status !== 'active' ? (
        <Panel className="flow-stack">
          <form className="flow-stack" onSubmit={startSession}>
            <fieldset className="duration-grid">
              <legend>Choose available time</legend>
              {getAheadDurationPresets.map((minutes) => (
                <label className="choice-card" key={minutes}>
                  <input
                    type="radio"
                    name="duration"
                    value={minutes}
                    checked={selectedMinutes === minutes && customMinutes === ''}
                    onChange={() => {
                      setCustomMinutes('')
                      setSelectedMinutes(minutes)
                      setDurationError(null)
                    }}
                  />
                  <span>{durationLabels.get(minutes)}</span>
                </label>
              ))}
            </fieldset>
            <div>
              <TextField
                id="custom-duration"
                label="Custom minutes"
                inputMode="numeric"
                min={5}
                max={240}
                step={1}
                type="number"
                value={customMinutes}
                onChange={updateCustom}
                error={durationError ?? undefined}
                hint="Use whole minutes from 5 to 240."
              />
            </div>
            <Button type="submit">Start Get Ahead</Button>
          </form>
        </Panel>
      ) : (
        <Panel className="flow-stack">
          <div className="cluster">
            <Sparkles aria-hidden="true" />
            <strong>{getAheadTotals(visibleSession).plannedMinutes} minutes planned</strong>
            <span>
              {getAheadTotals(visibleSession).selectedMinutes -
                getAheadTotals(visibleSession).plannedMinutes}{' '}
              minutes left unfilled.
            </span>
          </div>
          {visibleSession.tasks.length === 0 ? (
            <EmptyState
              title="No preparation tasks found"
              message="Your current plan has no supported Get Ahead opportunities yet."
            />
          ) : null}
          <ul className="plain-list flow-stack">
            {visibleSession.tasks.map((task) => {
              const currentRecipe = recipeList.find((recipe) => recipe.id === task.recipeId) ?? null
              const stale = isTaskStale(task, currentRecipe?.updatedAt ?? null)
              return (
                <li className="task-row" key={task.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.state === 'completed'}
                      disabled={stale}
                      onChange={(event) => {
                        const next = toggleGetAheadTask(
                          visibleSession,
                          task.id,
                          event.target.checked ? 'completed' : 'open',
                        )
                        persist(next)
                        setAnnouncement(
                          `${task.title} ${event.target.checked ? 'completed' : 'reopened'}.`,
                        )
                      }}
                    />
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        {task.estimatedMinutes} min estimate, saves about{' '}
                        {task.estimatedTimeSavedMinutes} min later,{' '}
                        {formatDisplayDate(task.mealDate)}
                      </small>
                      {stale ? (
                        <small role="status">Source changed since this session was created.</small>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
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
