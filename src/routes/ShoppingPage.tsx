import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarPlus, Check, Pencil, Plus, Trash2 } from 'lucide-react'

import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useOnboarding } from '../app/onboarding/onboardingContext'
import { useRecipeRepository } from '../app/recipes/recipeContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { SelectField } from '../components/ui/SelectField'
import { TextField } from '../components/ui/TextField'
import { addDays, currentWeek } from '../domain/meal-plans/week'
import { track } from '../infrastructure/observability/observability'
import { buildPlanAdditions, type PlanAdditions } from '../domain/shopping/planGeneration'
import {
  shoppingCategoryLabels,
  type ShoppingCategory,
  type ShoppingItem,
  type ShoppingItemInput,
} from '../domain/shopping/types'
import { shoppingItemInputSchema } from '../domain/shopping/validationSchemas'

const emptyInput: ShoppingItemInput = {
  name: '',
  quantity: null,
  unit: null,
  category: 'other',
}

type FieldErrors = Partial<Record<keyof ShoppingItemInput | 'form', string>>

export function ShoppingPage() {
  const { state } = useOnboarding()
  const householdId = state.householdId
  const repository = useShoppingRepository()
  const plannedMealRepository = usePlannedMealRepository()
  const recipeRepository = useRecipeRepository()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [planPreview, setPlanPreview] = useState<PlanAdditions | null>(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planNotice, setPlanNotice] = useState<string | null>(null)
  const [draft, setDraft] = useState<ShoppingItemInput>(emptyInput)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [editDraft, setEditDraft] = useState<ShoppingItemInput>(emptyInput)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!householdId) return
    repository
      .list(householdId)
      .then((next) => {
        if (active) setItems(next)
      })
      .catch(() => {
        if (active) setError('We could not load your shopping list. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository])

  const outstanding = items.filter((item) => !item.completed)
  const completed = items.filter((item) => item.completed)
  const grouped = useMemo(
    () =>
      outstanding.reduce<Partial<Record<ShoppingCategory, ShoppingItem[]>>>((groups, item) => {
        groups[item.category] = [...(groups[item.category] ?? []), item]
        return groups
      }, {}),
    [outstanding],
  )

  function validate(input: ShoppingItemInput, currentId?: string) {
    const result = shoppingItemInputSchema.safeParse(input)
    const nextErrors: FieldErrors = {}
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !(key in nextErrors)) {
          nextErrors[key as keyof ShoppingItemInput] = issue.message
        }
      }
    }
    const parsedName = result.success ? result.data.name : input.name.trim()
    if (
      items.some(
        (item) =>
          item.id !== currentId && item.name.toLocaleLowerCase() === parsedName.toLocaleLowerCase(),
      )
    ) {
      nextErrors.name = 'That item is already on your shopping list.'
    }
    if (currentId) setEditErrors(nextErrors)
    else setErrors(nextErrors)
    return result.success && Object.keys(nextErrors).length === 0 ? result.data : null
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId) return
    const input = validate(draft)
    if (!input) return
    setSaving(true)
    setError(null)
    try {
      const saved = await repository.create(householdId, input)
      setItems((current) => [...current, saved])
      setDraft(emptyInput)
      setErrors({})
    } catch (saveError) {
      setErrors({
        form: saveError instanceof Error ? saveError.message : 'Cooksmith could not add that item.',
      })
    } finally {
      setSaving(false)
    }
  }

  function openEdit(item: ShoppingItem) {
    setEditing(item)
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
    })
    setEditErrors({})
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const input = validate(editDraft, editing.id)
    if (!input) return
    setSaving(true)
    try {
      const saved = await repository.update(editing.id, input)
      setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setEditing(null)
    } catch (saveError) {
      setEditErrors({
        form:
          saveError instanceof Error ? saveError.message : 'Cooksmith could not save that item.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function previewPlanAdditions() {
    if (!householdId) return
    setPlanBusy(true)
    setPlanError(null)
    setPlanNotice(null)
    try {
      const weekStart = currentWeek(new Date())
      const meals = await plannedMealRepository.listWeek(
        householdId,
        weekStart,
        addDays(weekStart, 6),
      )
      const recipes = await recipeRepository.list(householdId)
      setPlanPreview(buildPlanAdditions(meals, recipes, items))
    } catch {
      setError("We could not read this week's plan. Try again.")
    } finally {
      setPlanBusy(false)
    }
  }

  async function confirmPlanAdditions() {
    if (!householdId || !planPreview) return
    setSaving(true)
    setPlanError(null)
    try {
      const saved = await repository.createFromPlan(householdId, planPreview.additions)
      track('shopping_list_generated', { itemCount: saved.length })
      setItems((current) => [...current, ...saved])
      setPlanNotice(
        saved.length === 1
          ? "Added 1 item from this week's meals."
          : `Added ${saved.length} items from this week's meals.`,
      )
      setPlanPreview(null)
    } catch (saveError) {
      setPlanError(
        saveError instanceof Error
          ? saveError.message
          : 'Cooksmith could not add those items. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompleted(item: ShoppingItem) {
    const previous = items
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, completed: !item.completed } : candidate,
      ),
    )
    try {
      const saved = await repository.setCompleted(item.id, !item.completed)
      if (saved.completed) track('shopping_item_completed')
      setItems((current) =>
        current.map((candidate) => (candidate.id === saved.id ? saved : candidate)),
      )
    } catch (updateError) {
      setItems(previous)
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Cooksmith could not update that item.',
      )
    }
  }

  async function removeItem(item: ShoppingItem) {
    if (!window.confirm(`Remove ${item.name} from your shopping list?`)) return
    try {
      await repository.remove(item.id)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that item.',
      )
    }
  }

  if (loading) return <LoadingState label="Loading your shopping list" />

  return (
    <main className="page-stack shopping-page">
      <DocumentTitle title="Shopping" />
      <header className="page-header shopping-header">
        <p className="eyebrow">One useful list</p>
        <h1>Shopping</h1>
        <p>Add what your household needs, then tick items off as you shop.</p>
      </header>

      <div className="shopping-summary" aria-label="Shopping list summary">
        <strong>{outstanding.length}</strong> left to buy
        {completed.length > 0 ? <span>{completed.length} done</span> : null}
        <Button
          busy={planBusy}
          type="button"
          variant="secondary"
          onClick={() => void previewPlanAdditions()}
        >
          <CalendarPlus aria-hidden="true" /> Add this week&apos;s meals
        </Button>
      </div>

      {planNotice ? (
        <p className="shopping-plan-notice" role="status">
          {planNotice}
        </p>
      ) : null}

      {error ? <ErrorState title="Shopping needs a quick check" message={error} /> : null}

      <Panel className="shopping-add-panel">
        <h2>Add an item</h2>
        <form className="shopping-form" onSubmit={(event) => void addItem(event)}>
          <TextField
            error={errors.name}
            label="Item name"
            required
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <TextField
            error={errors.quantity}
            inputMode="decimal"
            label="Quantity"
            optional
            value={draft.quantity === null ? '' : String(draft.quantity)}
            onChange={(event) =>
              setDraft({
                ...draft,
                quantity: event.target.value.trim() === '' ? null : Number(event.target.value),
              })
            }
          />
          <TextField
            error={errors.unit}
            label="Unit"
            optional
            value={draft.unit ?? ''}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
          />
          <SelectField
            label="Category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as ShoppingCategory })
            }
          >
            {Object.entries(shoppingCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          <Button busy={saving} disabled={!draft.name.trim()} type="submit">
            <Plus aria-hidden="true" /> Add item
          </Button>
        </form>
      </Panel>

      {outstanding.length === 0 ? (
        <Panel>
          <div className="empty-state">
            <h2>{items.length === 0 ? 'Your list is ready' : 'Everything is ticked off'}</h2>
            <p>
              {items.length === 0
                ? 'Add the first thing your household needs.'
                : 'Nice work. Completed items stay below until you remove them.'}
            </p>
          </div>
        </Panel>
      ) : null}

      {(Object.keys(shoppingCategoryLabels) as ShoppingCategory[]).map((category) => {
        const categoryItems = grouped[category] ?? []
        if (categoryItems.length === 0) return null
        return (
          <section
            className="shopping-category"
            key={category}
            aria-labelledby={`shopping-${category}`}
          >
            <h2 id={`shopping-${category}`}>{shoppingCategoryLabels[category]}</h2>
            <ul className="shopping-list">
              {categoryItems.map((item) => (
                <ShoppingItemRow
                  item={item}
                  key={item.id}
                  onEdit={openEdit}
                  onRemove={(candidate) => void removeItem(candidate)}
                  onToggle={(candidate) => void toggleCompleted(candidate)}
                />
              ))}
            </ul>
          </section>
        )
      })}

      {completed.length > 0 ? (
        <section
          className="shopping-category shopping-completed"
          aria-labelledby="shopping-completed"
        >
          <h2 id="shopping-completed">Done</h2>
          <ul className="shopping-list">
            {completed.map((item) => (
              <ShoppingItemRow
                item={item}
                key={item.id}
                onEdit={openEdit}
                onRemove={(candidate) => void removeItem(candidate)}
                onToggle={(candidate) => void toggleCompleted(candidate)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {planPreview ? (
        <Dialog
          description="Ingredients from this week's linked recipes, ready to add to your list."
          onOpenChange={(open) => {
            if (!open && !saving) setPlanPreview(null)
          }}
          open
          title="Add this week's meals"
        >
          {planPreview.additions.length === 0 ? (
            <div className="shopping-plan-preview">
              <p>
                {planPreview.linkedMealCount === 0
                  ? 'No meals this week are linked to a recipe yet. Link recipes on the Plan page, then try again.'
                  : "Everything from this week's linked recipes is already on your list."}
              </p>
              {planPreview.unlinkedMealCount > 0 && planPreview.linkedMealCount > 0 ? (
                <p>
                  {planPreview.unlinkedMealCount === 1
                    ? '1 planned meal has no linked recipe and was skipped.'
                    : `${planPreview.unlinkedMealCount} planned meals have no linked recipe and were skipped.`}
                </p>
              ) : null}
              <div className="dialog-actions">
                <Button type="button" onClick={() => setPlanPreview(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="shopping-plan-preview">
              <ul className="shopping-plan-preview-list">
                {planPreview.additions.map((addition) => (
                  <li key={addition.name}>
                    <strong>{addition.name}</strong>
                    {addition.quantity !== null ? (
                      <span>
                        {addition.quantity}
                        {addition.unit ? ` ${addition.unit}` : ''}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {planPreview.alreadyListedNames.length > 0 ? (
                <p>
                  Already on your list: {planPreview.alreadyListedNames.slice(0, 6).join(', ')}
                  {planPreview.alreadyListedNames.length > 6 ? ' and more' : ''}.
                </p>
              ) : null}
              {planPreview.unlinkedMealCount > 0 ? (
                <p>
                  {planPreview.unlinkedMealCount === 1
                    ? '1 planned meal has no linked recipe and was skipped.'
                    : `${planPreview.unlinkedMealCount} planned meals have no linked recipe and were skipped.`}
                </p>
              ) : null}
              {planError ? <p className="form-error">{planError}</p> : null}
              <div className="dialog-actions">
                <Button type="button" variant="secondary" onClick={() => setPlanPreview(null)}>
                  Cancel
                </Button>
                <Button busy={saving} type="button" onClick={() => void confirmPlanAdditions()}>
                  {planPreview.additions.length === 1
                    ? 'Add 1 item'
                    : `Add ${planPreview.additions.length} items`}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      ) : null}

      {editing ? (
        <Dialog
          description="Update this item for everyone in your household."
          onOpenChange={(open) => {
            if (!open && !saving) setEditing(null)
          }}
          open
          title={`Edit ${editing.name}`}
        >
          <form
            className="shopping-form shopping-edit-form"
            onSubmit={(event) => void saveEdit(event)}
          >
            <TextField
              data-autofocus
              error={editErrors.name}
              label="Item name"
              required
              value={editDraft.name}
              onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
            />
            <TextField
              error={editErrors.quantity}
              inputMode="decimal"
              label="Quantity"
              optional
              value={editDraft.quantity === null ? '' : String(editDraft.quantity)}
              onChange={(event) =>
                setEditDraft({
                  ...editDraft,
                  quantity: event.target.value.trim() === '' ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              error={editErrors.unit}
              label="Unit"
              optional
              value={editDraft.unit ?? ''}
              onChange={(event) => setEditDraft({ ...editDraft, unit: event.target.value })}
            />
            <SelectField
              label="Category"
              value={editDraft.category}
              onChange={(event) =>
                setEditDraft({ ...editDraft, category: event.target.value as ShoppingCategory })
              }
            >
              {Object.entries(shoppingCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            {editErrors.form ? <p className="form-error">{editErrors.form}</p> : null}
            <div className="dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button busy={saving} disabled={!editDraft.name.trim()} type="submit">
                Save changes
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </main>
  )
}

function ShoppingItemRow({
  item,
  onEdit,
  onRemove,
  onToggle,
}: {
  item: ShoppingItem
  onEdit: (item: ShoppingItem) => void
  onRemove: (item: ShoppingItem) => void
  onToggle: (item: ShoppingItem) => void
}) {
  const amount =
    item.quantity === null ? null : `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
  return (
    <li className={item.completed ? 'shopping-item shopping-item-completed' : 'shopping-item'}>
      <button
        aria-label={`${item.completed ? 'Mark as needed' : 'Mark as done'}: ${item.name}`}
        className="shopping-check"
        type="button"
        onClick={() => onToggle(item)}
      >
        {item.completed ? <Check aria-hidden="true" /> : null}
      </button>
      <div className="shopping-item-copy">
        <strong>{item.name}</strong>
        {amount ? <span>{amount}</span> : null}
      </div>
      <button
        aria-label={`Edit ${item.name}`}
        className="shopping-icon-action"
        type="button"
        onClick={() => onEdit(item)}
      >
        <Pencil aria-hidden="true" />
      </button>
      <button
        aria-label={`Remove ${item.name}`}
        className="shopping-icon-action"
        type="button"
        onClick={() => onRemove(item)}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </li>
  )
}
