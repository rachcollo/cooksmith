import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { LoadingState } from '../components/ui/LoadingState'
import { TextArea } from '../components/ui/TextArea'
import { TextField } from '../components/ui/TextField'
import type { PlannedMeal, PlannedMealInput } from '../domain/meal-plans/types'
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
type MealFieldErrors = Partial<Record<'title' | 'notes', string>>
type DragDetails = {
  meal: PlannedMeal
  startX: number
  startY: number
  targetDate: string
  active: boolean
}

function inputFor(mealDate: string): PlannedMealInput {
  return { mealDate, mealType: 'dinner', title: '', notes: null }
}

function compactDate(isoDate: string) {
  return formatDisplayDate(isoDate).replace(/\s+\d{4}$/, '')
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
  const [draggingMealId, setDraggingMealId] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const dragDetails = useRef<DragDetails | null>(null)
  const suppressMealClick = useRef(false)
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const visibleMeals = useMemo(
    () => meals.filter((meal) => meal.householdId === householdId && meal.mealType === 'dinner'),
    [householdId, meals],
  )
  const weekEnd = addDays(weekStart, 6)

  useEffect(() => {
    let active = true
    if (!householdId) return
    repository
      .listWeek(householdId, weekStart, weekEnd)
      .then((next) => {
        if (active) {
          setMeals(next)
          setError(null)
        }
      })
      .catch(() => {
        if (active) setError('We could not load this week’s dinners. Try refreshing Cooksmith.')
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
      if ((key === 'title' || key === 'notes') && !(key in nextErrors)) {
        nextErrors[key] = issue.message
      }
    }
    setFieldErrors(nextErrors)
    return null
  }

  function openAdd(mealDate: string) {
    setDialog({ mode: 'add', input: inputFor(mealDate) })
    setFieldErrors({})
    setFormError(null)
  }

  function openEdit(meal: PlannedMeal) {
    setDialog({
      mode: 'edit',
      meal,
      input: {
        mealDate: meal.mealDate,
        mealType: 'dinner',
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
      setFormError('Check the highlighted dinner details.')
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
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save that dinner.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(meal: PlannedMeal) {
    if (!window.confirm(`Remove ${meal.title} from the plan?`)) return
    try {
      await repository.remove(meal.id)
      setMeals((current) => current.filter((candidate) => candidate.id !== meal.id))
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that dinner.',
      )
    }
  }

  async function moveMeal(meal: PlannedMeal, targetDate: string) {
    if (meal.mealDate === targetDate) return
    const displaced = visibleMeals.find(
      (candidate) => candidate.mealDate === targetDate && candidate.id !== meal.id,
    )
    try {
      const [moved, swapped] = await Promise.all([
        repository.update(meal.id, { ...meal, mealDate: targetDate }),
        displaced
          ? repository.update(displaced.id, {
              ...displaced,
              mealDate: meal.mealDate,
            })
          : Promise.resolve(null),
      ])
      setMeals((current) =>
        current.map((candidate) => {
          if (candidate.id === moved.id) return moved
          if (swapped && candidate.id === swapped.id) return swapped
          return candidate
        }),
      )
      setError(null)
    } catch (moveError) {
      setError(
        moveError instanceof Error ? moveError.message : 'Cooksmith could not move that dinner.',
      )
    }
  }

  function startDrag(meal: PlannedMeal, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    dragDetails.current = {
      meal,
      startX: event.clientX,
      startY: event.clientY,
      targetDate: meal.mealDate,
      active: false,
    }
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const details = dragDetails.current
    if (!details) return
    const distance = Math.hypot(event.clientX - details.startX, event.clientY - details.startY)
    if (!details.active && distance < 8) return
    details.active = true
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-meal-date]')
    if (target?.dataset.mealDate) details.targetDate = target.dataset.mealDate
    setDraggingMealId(details.meal.id)
    setDropTargetDate(details.targetDate)
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const details = dragDetails.current
    dragDetails.current = null
    if (
      typeof event.currentTarget.hasPointerCapture === 'function' &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingMealId(null)
    setDropTargetDate(null)
    if (details?.active) {
      suppressMealClick.current = true
      void moveMeal(details.meal, details.targetDate)
    }
  }

  return (
    <main className="page-stack meal-planner-page">
      <DocumentTitle title="Meal Planner" />
      <header className="page-header meal-planner-header">
        <p className="eyebrow">The weekly wrangle</p>
        <h1>Seven days. Let’s not overthink it.</h1>
        <p>Plan the dinners that help. Leave the rest blank.</p>
      </header>

      <div className="meal-week-toolbar" aria-label="Week navigation">
        <Button
          variant="quiet"
          type="button"
          aria-label="Previous week"
          onClick={() => setWeekStart(previousWeek(weekStart))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <div>
          <strong>{formatWeekRange(weekStart)}</strong>
          {weekStart !== thisWeek ? (
            <button type="button" onClick={() => setWeekStart(thisWeek)}>
              Back to this week
            </button>
          ) : null}
        </div>
        <Button
          variant="quiet"
          type="button"
          aria-label="Next week"
          onClick={() => setWeekStart(nextWeek(weekStart))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <p className="meal-planner-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingState label="Loading this week’s dinners" />
      ) : (
        <section className="meal-week" aria-label="Weekly dinner planner">
          {days.map((day) => {
            const meal = visibleMeals.find((candidate) => candidate.mealDate === day)
            return (
              <article
                className={[
                  'meal-day',
                  day === today ? 'meal-day-today' : '',
                  day === dropTargetDate ? 'meal-day-drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={day}
                data-meal-date={day}
                aria-labelledby={`meal-day-${day}`}
              >
                <header className="meal-day-heading">
                  <div>
                    <p>{formatDayLabel(day)}</p>
                    <h2 id={`meal-day-${day}`}>{compactDate(day)}</h2>
                  </div>
                  {day === today ? <span className="meal-today-badge">Today</span> : null}
                </header>

                {meal ? (
                  <div
                    className={`planned-meal${draggingMealId === meal.id ? ' dragging' : ''}`}
                    onPointerDown={(event) => startDrag(meal, event)}
                    onPointerMove={continueDrag}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                  >
                    <GripVertical aria-hidden="true" className="meal-drag-handle" />
                    <button
                      className="planned-meal-title"
                      type="button"
                      onClick={() => {
                        if (suppressMealClick.current) {
                          suppressMealClick.current = false
                          return
                        }
                        openEdit(meal)
                      }}
                    >
                      <strong>{meal.title}</strong>
                      {meal.notes ? <span>{meal.notes}</span> : null}
                    </button>
                    <button
                      className="meal-remove"
                      type="button"
                      aria-label={`Remove ${meal.title}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => void remove(meal)}
                    >
                      <X aria-hidden="true" />
                    </button>
                    <label className="meal-move-control">
                      <span>Move {meal.title}</span>
                      <select
                        aria-label={`Move ${meal.title} to another day`}
                        value={meal.mealDate}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) => void moveMeal(meal, event.target.value)}
                      >
                        {days.map((date) => (
                          <option value={date} key={date}>
                            {formatDayLabel(date)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <Button
                    aria-label="Add dinner"
                    variant="secondary"
                    type="button"
                    onClick={() => openAdd(day)}
                  >
                    + Add dinner
                  </Button>
                )}
              </article>
            )
          })}
        </section>
      )}

      <aside className="meal-planner-permission">
        <span aria-hidden="true">🍕</span>
        <div>
          <strong>Plans change. That’s the plan.</strong>
          <p>Press and drag a dinner to move it, or use its Move control.</p>
        </div>
      </aside>

      {dialog ? (
        <Dialog
          open
          title={dialog.mode === 'add' ? 'Add dinner' : `Edit ${dialog.meal.title}`}
          description={compactDate(dialog.input.mealDate)}
          onOpenChange={(open) => {
            if (!open && !saving) setDialog(null)
          }}
        >
          <form className="pantry-form pantry-edit-form" onSubmit={(event) => void submit(event)}>
            <TextField
              data-autofocus
              error={fieldErrors.title}
              label="Dinner"
              required
              value={dialog.input.title}
              onChange={(event) => updateDialog({ ...dialog.input, title: event.target.value })}
            />
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
                Save dinner
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </main>
  )
}
