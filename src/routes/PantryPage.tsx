import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ListFilter, Plus, Sparkles } from 'lucide-react'

import { Dialog } from '../components/ui/Dialog'

import { usePlannedMealRepository } from '../app/meal-plans/plannedMealContext'
import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePantryRepository } from '../app/pantry/pantryContext'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { SelectField } from '../components/ui/SelectField'
import { TextField } from '../components/ui/TextField'
import {
  pantryCategoryLabels,
  pantryStorageLocationLabels,
  type PantryItem,
  type PantryItemCategory,
  type PantryItemInput,
  type PantryStorageLocation,
} from '../domain/pantry/types'
import { classifyPantryItem } from '../domain/pantry/classification'
import { createPantryInsights, type PantryInsight } from '../domain/pantry/intelligence'
import { pantryItemInputSchema } from '../domain/pantry/validationSchemas'

const emptyInput: PantryItemInput = {
  name: '',
  category: 'uncategorised',
  categorySource: 'automatic',
  storageLocation: 'other',
  storageLocationSource: 'automatic',
  classificationVersion: null,
  quantity: null,
  unit: null,
  available: true,
}

type PantryFieldErrors = Partial<Record<keyof PantryItemInput | 'duplicate', string>>

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type LocationFilter = 'all' | PantryStorageLocation

export function PantryPage() {
  const { state } = useOnboarding()
  const repository = usePantryRepository()
  const shoppingRepository = useShoppingRepository()
  const plannedMealRepository = usePlannedMealRepository()
  const householdId = state.householdId
  const [items, setItems] = useState<PantryItem[]>([])
  const [draft, setDraft] = useState<PantryItemInput>(emptyInput)
  const [itemError, setItemError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<PantryFieldErrors>({})
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [editDraft, setEditDraft] = useState<PantryItemInput>(emptyInput)
  const [editErrors, setEditErrors] = useState<PantryFieldErrors>({})
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<LocationFilter>('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [category, setCategory] = useState<'all' | PantryItem['category']>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingOpen, setAddingOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingSaving, setEditingSaving] = useState(false)
  const [insights, setInsights] = useState<PantryInsight[]>([])
  const [ignoredInsightIds, setIgnoredInsightIds] = useState<Set<string>>(() => new Set())
  const [insightError, setInsightError] = useState<string | null>(null)
  const [pantrySuggestionsOpen, setPantrySuggestionsOpen] = useState(false)
  const [addingInsightId, setAddingInsightId] = useState<string | null>(null)
  const [savingInsightId, setSavingInsightId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!householdId) return
    repository
      .list(householdId)
      .then((next) => {
        if (active) setItems(next)
      })
      .catch(() => {
        if (active) setError('We could not load your household staples. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository])

  const visibleInsights = useMemo(
    () => insights.filter((insight) => !ignoredInsightIds.has(insight.id)),
    [ignoredInsightIds, insights],
  )

  async function generatePantrySuggestions() {
    if (!householdId) return
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    setInsightError(null)
    try {
      const [shoppingItems, plannedMeals] = await Promise.all([
        shoppingRepository.list(householdId),
        plannedMealRepository.listWeek(
          householdId,
          today.toISOString().slice(0, 10),
          weekEnd.toISOString().slice(0, 10),
        ),
      ])
      const nextInsights = createPantryInsights({ pantryItems: items, shoppingItems, plannedMeals })
      setInsights(nextInsights)
      setIgnoredInsightIds(new Set())
      setPantrySuggestionsOpen(true)
    } catch (suggestionError) {
      setInsightError(
        suggestionError instanceof Error
          ? suggestionError.message
          : 'Pantry suggestions are unavailable right now.',
      )
    }
  }

  async function addInsightToShopping(insight: PantryInsight) {
    if (!householdId) return
    setAddingInsightId(insight.id)
    setInsightError(null)
    try {
      await shoppingRepository.create(householdId, insight.shoppingInput)
      setIgnoredInsightIds((current) => new Set(current).add(insight.id))
    } catch (addError) {
      setInsightError(
        addError instanceof Error ? addError.message : 'Cooksmith could not add that item.',
      )
    } finally {
      setAddingInsightId(null)
    }
  }

  async function markInsightGotIt(insight: PantryInsight) {
    const item = items.find((candidate) => candidate.id === insight.pantryItemId)
    if (!item) return
    if (item.available) {
      setIgnoredInsightIds((current) => new Set(current).add(insight.id))
      return
    }
    const input: PantryItemInput = {
      name: item.name,
      category: item.category,
      categorySource: item.categorySource,
      storageLocation: item.storageLocation,
      storageLocationSource: item.storageLocationSource,
      classificationVersion: item.classificationVersion,
      quantity: item.quantity,
      unit: item.unit,
      available: true,
    }
    setSavingInsightId(insight.id)
    setInsightError(null)
    try {
      const saved = await repository.update(item.id, input)
      setItems((current) =>
        current.map((candidate) => (candidate.id === saved.id ? saved : candidate)),
      )
      setIgnoredInsightIds((current) => new Set(current).add(insight.id))
    } catch (quantityError) {
      setInsightError(
        quantityError instanceof Error
          ? quantityError.message
          : 'Cooksmith could not update that pantry item.',
      )
    } finally {
      setSavingInsightId(null)
    }
  }

  function ignoreInsight(insightId: string) {
    setIgnoredInsightIds((current) => new Set(current).add(insightId))
  }

  const filteredItems = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase()
    return items
      .filter((item) => !normalisedQuery || item.name.toLocaleLowerCase().includes(normalisedQuery))
      .filter((item) => location === 'all' || item.storageLocation === location)
      .filter((item) => category === 'all' || item.category === category)
      .filter((item) => {
        if (availability === 'available') return item.available
        if (availability === 'unavailable') return !item.available
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availability, category, items, location, query])

  const grouped = useMemo(
    () =>
      filteredItems.reduce<
        Partial<Record<PantryStorageLocation, Partial<Record<PantryItemCategory, PantryItem[]>>>>
      >((locations, item) => {
        const categories = locations[item.storageLocation] ?? {}
        categories[item.category] = [...(categories[item.category] ?? []), item]
        locations[item.storageLocation] = categories
        return locations
      }, {}),
    [filteredItems],
  )

  const availableCount = items.filter((item) => item.available).length

  const filtersActive =
    query.trim() !== '' || location !== 'all' || category !== 'all' || availability !== 'all'

  function validateDraft(input: PantryItemInput, currentItemId?: string): PantryItemInput | null {
    const result = pantryItemInputSchema.safeParse(input)
    const nextErrors: PantryFieldErrors = {}
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !(key in nextErrors)) {
          nextErrors[key as keyof PantryItemInput] = issue.message
        }
      }
    }
    const parsedName = result.success ? result.data.name : input.name.trim()
    const duplicate = items.some(
      (item) =>
        item.id !== currentItemId &&
        item.name.toLocaleLowerCase() === parsedName.toLocaleLowerCase(),
    )
    if (duplicate) {
      nextErrors.duplicate = 'That item is already in your household pantry.'
      nextErrors.name = nextErrors.name ?? 'Use a different item name.'
    }
    if (currentItemId) setEditErrors(nextErrors)
    else setFieldErrors(nextErrors)
    return result.success && !duplicate ? result.data : null
  }

  function openEdit(item: PantryItem) {
    setEditingItem(item)
    setEditDraft({
      name: item.name,
      category: item.category,
      categorySource: item.categorySource,
      storageLocation: item.storageLocation,
      storageLocationSource: item.storageLocationSource,
      classificationVersion: item.classificationVersion,
      quantity: item.quantity,
      unit: item.unit,
      available: item.available,
    })
    setEditErrors({})
    setItemError(null)
  }

  function closeEdit() {
    if (editingSaving) return
    setEditingItem(null)
    setEditDraft(emptyInput)
    setEditErrors({})
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId) return
    const classification = classifyPantryItem(draft.name)
    const result = validateDraft({
      ...draft,
      category: classification.category,
      categorySource: 'automatic',
      storageLocation: classification.storageLocation,
      storageLocationSource: 'automatic',
      classificationVersion: classification.version,
    })
    if (!result) {
      setItemError('Check the highlighted pantry item details.')
      return
    }
    setSaving(true)
    setError(null)
    setItemError(null)
    try {
      const saved = await repository.create(householdId, result)
      setItems((current) => [...current, saved])
      setDraft(emptyInput)
      setFieldErrors({})
      setAddingOpen(false)
    } catch (saveError) {
      setItemError(
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save that item.',
      )
    } finally {
      setSaving(false)
    }
  }

  function setAddDialogOpen(open: boolean) {
    if (saving) return
    setAddingOpen(open)
    if (!open) {
      setDraft(emptyInput)
      setFieldErrors({})
      setItemError(null)
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingItem) return
    const renamed = editDraft.name.trim() !== editingItem.name.trim()
    const classification = renamed ? classifyPantryItem(editDraft.name) : null
    const preparedDraft: PantryItemInput = {
      ...editDraft,
      category:
        classification && editDraft.categorySource === 'automatic'
          ? classification.category
          : editDraft.category,
      storageLocation:
        classification && editDraft.storageLocationSource === 'automatic'
          ? classification.storageLocation
          : editDraft.storageLocation,
      classificationVersion:
        classification &&
        (editDraft.categorySource === 'automatic' ||
          editDraft.storageLocationSource === 'automatic')
          ? classification.version
          : editDraft.classificationVersion,
    }
    const result = validateDraft(preparedDraft, editingItem.id)
    if (!result) return
    setEditingSaving(true)
    setItemError(null)
    try {
      const saved = await repository.update(editingItem.id, result)
      setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setEditingItem(null)
      setEditDraft(emptyInput)
      setEditErrors({})
    } catch (saveError) {
      setEditErrors({
        duplicate:
          saveError instanceof Error ? saveError.message : 'Cooksmith could not save that item.',
      })
    } finally {
      setEditingSaving(false)
    }
  }

  async function toggleAvailability(item: PantryItem) {
    const previous = items
    const input: PantryItemInput = {
      name: item.name,
      category: item.category,
      categorySource: item.categorySource,
      storageLocation: item.storageLocation,
      storageLocationSource: item.storageLocationSource,
      classificationVersion: item.classificationVersion,
      quantity: item.quantity,
      unit: item.unit,
      available: !item.available,
    }
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, available: !item.available } : candidate,
      ),
    )
    try {
      const saved = await repository.update(item.id, input)
      setItems((current) =>
        current.map((candidate) => (candidate.id === item.id ? saved : candidate)),
      )
    } catch (updateError) {
      setItems(previous)
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Cooksmith could not update availability.',
      )
    }
  }

  async function remove(item: PantryItem) {
    if (!window.confirm(`Remove ${item.name} from your household staples?`)) return
    try {
      await repository.remove(item.id)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
      if (editingItem?.id === item.id) {
        closeEdit()
      }
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that item.',
      )
    }
  }

  if (loading) return <LoadingState label="Loading your household staples" />

  return (
    <main className="page-stack">
      <DocumentTitle title="Pantry" />
      <header className="page-header pantry-header">
        <h1>Pantry</h1>
      </header>

      <div className="pantry-summary" aria-label="Household staples summary">
        <span>{items.length} total</span>
        <span>{availableCount} available</span>
        <span>{items.length - availableCount} out of stock</span>
      </div>

      {error ? <ErrorState title="Pantry needs a quick check" message={error} /> : null}
      {insightError ? (
        <ErrorState title="Pantry suggestions need a quick check" message={insightError} />
      ) : null}

      <Panel className="pantry-discovery">
        <div className="pantry-discovery-row">
          <TextField
            label="Search staples"
            placeholder="Search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            aria-controls="pantry-filters"
            aria-expanded={filtersOpen}
            aria-label="Filters"
            variant="secondary"
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <ListFilter aria-hidden="true" size={20} />
          </Button>
          <Button aria-label="Add pantry item" type="button" onClick={() => setAddDialogOpen(true)}>
            <Plus aria-hidden="true" size={20} />
          </Button>
        </div>
        {filtersOpen ? (
          <div className="pantry-filters" id="pantry-filters">
            <SelectField
              label="Location filter"
              value={location}
              onChange={(event) => setLocation(event.target.value as LocationFilter)}
            >
              <option value="all">All locations</option>
              {Object.entries(pantryStorageLocationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Availability filter"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
            >
              <option value="all">All items</option>
              <option value="available">Available</option>
              <option value="unavailable">Out of stock</option>
            </SelectField>
            <SelectField
              label="Category filter"
              value={category}
              onChange={(event) => setCategory(event.target.value as typeof category)}
            >
              <option value="all">All categories</option>
              {Object.entries(pantryCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
      </Panel>

      <Panel className="pantry-insights-callout" tone="feature">
        <Button
          aria-label="Review pantry suggestions"
          variant="secondary"
          type="button"
          onClick={() => void generatePantrySuggestions()}
        >
          <Sparkles aria-hidden="true" size={20} />
          Review suggestions
        </Button>
      </Panel>

      {filteredItems.length === 0 ? (
        <Panel>
          <div className="empty-state">
            <h2>{items.length === 0 ? 'Start your pantry' : 'No matching pantry items'}</h2>
            <p>
              {items.length === 0
                ? 'Add everyday staples so everyone can see what is available before cooking or shopping.'
                : filtersActive
                  ? 'Try clearing search or changing filters to see more of your household pantry.'
                  : 'Add a pantry item to begin.'}
            </p>
            {items.length > 0 && filtersActive ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setQuery('')
                  setLocation('all')
                  setCategory('all')
                  setAvailability('all')
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {(Object.keys(pantryStorageLocationLabels) as PantryStorageLocation[]).map(
        (storageLocation) => {
          const locationCategories = grouped[storageLocation] ?? {}
          if (Object.keys(locationCategories).length === 0) return null
          return (
            <section
              className="pantry-section"
              key={storageLocation}
              aria-labelledby={`pantry-${storageLocation}`}
            >
              <h2 id={`pantry-${storageLocation}`}>
                {pantryStorageLocationLabels[storageLocation]}
              </h2>
              {(Object.keys(pantryCategoryLabels) as PantryItemCategory[]).map((itemCategory) => {
                const categoryItems = locationCategories[itemCategory] ?? []
                if (categoryItems.length === 0) return null
                return (
                  <section className="pantry-category" key={itemCategory}>
                    <h3>{pantryCategoryLabels[itemCategory]}</h3>
                    <div className="pantry-grid">
                      {categoryItems.map((item) => (
                        <article className="pantry-card" key={item.id}>
                          <button
                            aria-label={`Edit ${item.name}`}
                            className="pantry-card-edit-action"
                            type="button"
                            onClick={() => openEdit(item)}
                          >
                            <h4>{item.name}</h4>
                            {item.quantity !== null ? (
                              <p className="pantry-quantity">
                                {`${item.quantity} ${item.unit ?? ''}`.trim()}
                              </p>
                            ) : null}
                          </button>
                          <div className="pantry-stock-control">
                            <Button
                              aria-label={
                                item.available
                                  ? `${item.name} available. Mark not available`
                                  : `${item.name} not available. Mark available`
                              }
                              className="pantry-stock-action"
                              variant="secondary"
                              type="button"
                              onClick={() => void toggleAvailability(item)}
                            >
                              {item.available ? 'Available' : 'Out of stock'}
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )
              })}
            </section>
          )
        },
      )}

      <Dialog
        description="One compact line per suggestion. Add it to Shopping, mark you have it, or ignore it for this generated list."
        onOpenChange={setPantrySuggestionsOpen}
        open={pantrySuggestionsOpen}
        title="Pantry suggestions"
      >
        <div className="pantry-suggestions-dialog">
          {visibleInsights.length === 0 ? (
            <p>
              No pantry suggestions right now. Generate again later when your Pantry or meal plan
              changes.
            </p>
          ) : (
            <ul className="pantry-suggestion-lines" aria-label="Generated pantry suggestions">
              {visibleInsights.map((insight) => (
                <li key={insight.id} className="pantry-suggestion-line">
                  <strong className="pantry-suggestion-name">{insight.itemName}</strong>
                  <div className="pantry-suggestion-actions">
                    <Button
                      type="button"
                      onClick={() => void addInsightToShopping(insight)}
                      busy={addingInsightId === insight.id}
                    >
                      Add
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void markInsightGotIt(insight)}
                      busy={savingInsightId === insight.id}
                    >
                      Got it
                    </Button>
                    <Button variant="quiet" type="button" onClick={() => ignoreInsight(insight.id)}>
                      Ignore
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        description="Add the staple name and, if useful, a quantity. Cooksmith will suggest the best category and storage location."
        onOpenChange={setAddDialogOpen}
        open={addingOpen}
        title="Add pantry item"
      >
        <form className="pantry-form pantry-compact-form" onSubmit={(event) => void submit(event)}>
          <TextField
            data-autofocus
            error={fieldErrors.name}
            label="Item name"
            required
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <div className="pantry-quantity-fields">
            <TextField
              error={fieldErrors.quantity}
              label="Quantity"
              inputMode="decimal"
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
              error={fieldErrors.unit}
              label="Unit"
              optional
              value={draft.unit ?? ''}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
            />
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.available}
              onChange={(event) => setDraft({ ...draft, available: event.target.checked })}
            />
            Available now
          </label>
          {itemError ? <p className="form-error">{itemError}</p> : null}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" busy={saving} disabled={draft.name.trim() === ''}>
              Add item
            </Button>
          </div>
        </form>
      </Dialog>

      {editingItem ? (
        <Dialog
          description="Update the pantry details for this household item."
          onOpenChange={(open) => {
            if (!open) closeEdit()
          }}
          open={Boolean(editingItem)}
          title={`Edit ${editingItem.name}`}
        >
          <form
            className="pantry-form pantry-edit-form"
            onSubmit={(event) => void submitEdit(event)}
          >
            <TextField
              data-autofocus
              error={editErrors.name}
              label="Item name"
              required
              value={editDraft.name}
              onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
            />
            <div className="pantry-edit-field-row">
              <SelectField
                error={editErrors.storageLocation}
                label="Location"
                value={editDraft.storageLocation}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    storageLocation: event.target.value as PantryStorageLocation,
                    storageLocationSource: 'explicit',
                  })
                }
              >
                {Object.entries(pantryStorageLocationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                error={editErrors.category}
                label="Category"
                value={editDraft.category}
                onChange={(event) =>
                  setEditDraft({
                    ...editDraft,
                    category: event.target.value as PantryItemInput['category'],
                    categorySource: 'explicit',
                  })
                }
              >
                {Object.entries(pantryCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="pantry-edit-field-row">
              <TextField
                error={editErrors.quantity}
                label="Quantity"
                inputMode="decimal"
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
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={editDraft.available}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, available: event.target.checked })
                }
              />
              Available now
            </label>
            {editErrors.duplicate ? <p className="form-error">{editErrors.duplicate}</p> : null}
            <Button
              className="pantry-delete-action"
              variant="quiet"
              type="button"
              onClick={() => void remove(editingItem)}
              disabled={editingSaving}
            >
              Delete item
            </Button>
            <div className="dialog-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={closeEdit}
                disabled={editingSaving}
              >
                Cancel
              </Button>
              <Button type="submit" busy={editingSaving} disabled={editDraft.name.trim() === ''}>
                Save changes
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </main>
  )
}
