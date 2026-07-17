import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { SelectField } from '../components/ui/SelectField'
import { TextArea } from '../components/ui/TextArea'
import { TextField } from '../components/ui/TextField'
import {
  mealTypeLabels,
  mealTypes,
  type MealType,
  type PlannedMeal,
  type PlannedMealInput,
} from '../domain/meal-plans/types'
import { plannedMealInputSchema } from '../domain/meal-plans/validationSchemas'
import {
  addDays,
  currentWeek,
  formatDayLabel,
  formatDisplayDate,
  formatWeekRange,
  nextWeek,
  previousWeek,
  toLocalIsoDate,
  weekDays,
} from '../domain/meal-plans/week'

type MealDialog =
  | { mode: 'add'; input: PlannedMealInput }
  | { mode: 'edit'; meal: PlannedMeal; input: PlannedMealInput }
type MealFieldErrors = Partial<Record<keyof PlannedMealInput, string>>

function inputFor(mealDate: string, mealType: MealType): PlannedMealInput {
  return { mealDate, mealType, title: '', notes: null }
}

export function PlanPage() {
  const { state } = useOnboarding()
  const repository = usePlannedMealRepository()
  const householdId = state.householdId
  const today = toLocalIsoDate(new Date())
  const thisWeek = currentWeek(new Date())
  const [weekStart, setWeekStart] = useState(thisWeek)
  const [meals, setMeals] = useState<PlannedMeal[]>([])
  const [dialog, setDialog] = useState<MealDialog | null>(null)
  const [fieldErrors, setFieldErrors] = useState<MealFieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const weekEnd = addDays(weekStart, 6)

  useEffect(() => {
    let active = true
    setMeals([])
    setError(null)
    if (!householdId) {
      setLoading(false)
      return
    }
    setLoading(true)
    repository
      .listWeek(householdId, weekStart, weekEnd)
      .then((next) => {
        if (active) setMeals(next)
      })
      .catch(() => {
        if (active) setError('We could not load this week’s meal plan. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository, weekEnd, weekStart])

  function validate(input: PlannedMealInput): PlannedMealInput | null {
    const result = plannedMealInputSchema.safeParse(input)
    if (result.success) {
      setFieldErrors({})
      return result.data
    }
    const nextErrors: MealFieldErrors = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (typeof key === 'string' && !(key in nextErrors))
        nextErrors[key as keyof PlannedMealInput] = issue.message
    }
    setFieldErrors(nextErrors)
    return null
  }

  function openAdd(mealDate: string, mealType: MealType) {
    setDialog({ mode: 'add', input: inputFor(mealDate, mealType) })
    setFieldErrors({})
    setFormError(null)
  }
  function openEdit(meal: PlannedMeal) {
    setDialog({
      mode: 'edit',
      meal,
      input: {
        mealDate: meal.mealDate,
        mealType: meal.mealType,
        title: meal.title,
        notes: meal.notes,
      },
    })
    setFieldErrors({})
    setFormError(null)
  }
  function updateDialog(input: PlannedMealInput) {
    if (!dialog) return
    setDialog(
      dialog.mode === 'add' ? { mode: 'add', input } : { mode: 'edit', meal: dialog.meal, input },
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog || !householdId) return
    const input = validate(dialog.input)
    if (!input) {
      setFormError('Check the highlighted meal details.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const saved =
        dialog.mode === 'add'
          ? await repository.create(householdId, input)
          : await repository.update(dialog.meal.id, input)
      setMeals((current) =>
        dialog.mode === 'add'
          ? [...current, saved]
          : current.map((meal) => (meal.id === saved.id ? saved : meal)),
      )
      setDialog(null)
    } catch (saveError) {
      setFormError(
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save that meal.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(meal: PlannedMeal) {
    if (!window.confirm(`Remove ${meal.title} from the meal plan?`)) return
    try {
      await repository.remove(meal.id)
      setMeals((current) => current.filter((candidate) => candidate.id !== meal.id))
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that meal.',
      )
    }
  }

  return (
    <main className="page-stack">
      <DocumentTitle title="Meal Planner" />
      <header className="page-header">
        <p className="eyebrow">Shared weekly plan</p>
        <h1>Meal Planner</h1>
        <p>Plan breakfast, lunch and dinner for your active household.</p>
      </header>
      <Panel className="meal-planner-toolbar">
        <div>
          <h2>{formatWeekRange(weekStart)}</h2>
          <p>Monday to Sunday · dates shown in Australian format.</p>
        </div>
        <div className="meal-planner-actions">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setWeekStart(previousWeek(weekStart))}
          >
            Previous week
          </Button>
          <Button variant="secondary" type="button" onClick={() => setWeekStart(thisWeek)}>
            Current week
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setWeekStart(nextWeek(weekStart))}
          >
            Next week
          </Button>
        </div>
      </Panel>
      {error ? <ErrorState title="Meal planner needs a quick check" message={error} /> : null}
      {loading ? (
        <LoadingState label="Loading this week’s meal plan" />
      ) : (
        <section className="meal-week" aria-label="Weekly meal planner">
          {meals.length === 0 ? (
            <Panel>
              <div className="empty-state">
                <h2>No planned meals yet</h2>
                <p>Add a breakfast, lunch or dinner to begin this household’s shared plan.</p>
              </div>
            </Panel>
          ) : null}
          {days.map((day) => (
            <article
              className={`meal-day${day === today ? ' meal-day-today' : ''}`}
              key={day}
              aria-labelledby={`meal-day-${day}`}
            >
              <header>
                <p>{formatDayLabel(day)}</p>
                <h2 id={`meal-day-${day}`}>{formatDisplayDate(day)}</h2>
                {day === today ? <span className="meal-today-badge">Today</span> : null}
              </header>
              {mealTypes.map((mealType) => {
                const slotMeals = meals.filter(
                  (meal) => meal.mealDate === day && meal.mealType === mealType,
                )
                return (
                  <section
                    className="meal-slot"
                    key={mealType}
                    aria-labelledby={`meal-${day}-${mealType}`}
                  >
                    <div className="meal-slot-heading">
                      <h3 id={`meal-${day}-${mealType}`}>{mealTypeLabels[mealType]}</h3>
                      <Button variant="quiet" type="button" onClick={() => openAdd(day, mealType)}>
                        Add
                      </Button>
                    </div>
                    {slotMeals.length === 0 ? (
                      <p className="meal-slot-empty">Nothing planned.</p>
                    ) : (
                      slotMeals.map((meal) => (
                        <div className="planned-meal" key={meal.id}>
                          <div>
                            <strong>{meal.title}</strong>
                            {meal.notes ? <p>{meal.notes}</p> : null}
                          </div>
                          <div className="meal-card-actions">
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() => openEdit(meal)}
                            >
                              Edit
                            </Button>
                            <Button variant="quiet" type="button" onClick={() => void remove(meal)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                )
              })}
            </article>
          ))}
        </section>
      )}
      {dialog ? (
        <Dialog
          open={Boolean(dialog)}
          title={dialog.mode === 'add' ? 'Add planned meal' : `Edit ${dialog.meal.title}`}
          description="Save a named meal to the household weekly plan."
          onOpenChange={(open) => {
            if (!open && !saving) setDialog(null)
          }}
        >
          <form className="pantry-form pantry-edit-form" onSubmit={(event) => void submit(event)}>
            <TextField
              data-autofocus
              error={fieldErrors.title}
              label="Meal title"
              required
              value={dialog.input.title}
              onChange={(event) => updateDialog({ ...dialog.input, title: event.target.value })}
            />
            <TextField
              error={fieldErrors.mealDate}
              label="Date"
              required
              type="date"
              value={dialog.input.mealDate}
              onChange={(event) => updateDialog({ ...dialog.input, mealDate: event.target.value })}
            />
            <SelectField
              error={fieldErrors.mealType}
              label="Meal type"
              value={dialog.input.mealType}
              onChange={(event) =>
                updateDialog({ ...dialog.input, mealType: event.target.value as MealType })
              }
            >
              {mealTypes.map((mealType) => (
                <option key={mealType} value={mealType}>
                  {mealTypeLabels[mealType]}
                </option>
              ))}
            </SelectField>
            <TextArea
              error={fieldErrors.notes}
              label="Notes"
              optional
              value={dialog.input.notes ?? ''}
              onChange={(event) => updateDialog({ ...dialog.input, notes: event.target.value })}
            />
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setDialog(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" busy={saving} disabled={dialog.input.title.trim() === ''}>
                Save meal
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </main>
  )
}
