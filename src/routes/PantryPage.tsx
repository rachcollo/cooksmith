import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePantryRepository } from '../app/pantry/pantryContext'
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
  type PantryItemInput,
  type PantryStorageLocation,
} from '../domain/pantry/types'
import { pantryItemInputSchema } from '../domain/pantry/validationSchemas'

const emptyInput: PantryItemInput = {
  name: '',
  category: 'other',
  storageLocation: 'pantry',
  quantity: null,
  unit: null,
  available: true,
}

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type LocationFilter = 'all' | PantryStorageLocation

export function PantryPage() {
  const { state } = useOnboarding()
  const repository = usePantryRepository()
  const householdId = state.householdId
  const [items, setItems] = useState<PantryItem[]>([])
  const [draft, setDraft] = useState<PantryItemInput>(emptyInput)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState<LocationFilter>('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [category, setCategory] = useState<'all' | PantryItem['category']>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      filteredItems.reduce<Partial<Record<PantryStorageLocation, PantryItem[]>>>((groups, item) => {
        groups[item.storageLocation] = [...(groups[item.storageLocation] ?? []), item]
        return groups
      }, {}),
    [filteredItems],
  )

  const availableCount = items.filter((item) => item.available).length

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId) return
    const result = pantryItemInputSchema.safeParse(draft)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check the household staple.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = editingId
        ? await repository.update(editingId, result.data)
        : await repository.create(householdId, result.data)
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved],
      )
      setDraft(emptyInput)
      setEditingId(null)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Cooksmith could not save that item.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability(item: PantryItem) {
    const previous = items
    const input: PantryItemInput = {
      name: item.name,
      category: item.category,
      storageLocation: item.storageLocation,
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
      if (editingId === item.id) {
        setEditingId(null)
        setDraft(emptyInput)
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
      <header className="page-header">
        <p className="eyebrow">Your household staples</p>
        <h1>Pantry</h1>
        <p>Keep everyday staples organised across your pantry, fridge and freezer.</p>
      </header>

      <div className="pantry-summary" aria-label="Household staples summary">
        <span>{items.length} total</span>
        <span>{availableCount} available</span>
        <span>{items.length - availableCount} out of stock</span>
      </div>

      {error ? <ErrorState title="Pantry needs a quick check" message={error} /> : null}

      <Panel className="pantry-form-panel">
        <form className="pantry-form" onSubmit={(event) => void submit(event)}>
          <TextField
            label="Item name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <SelectField
            label="Location"
            value={draft.storageLocation}
            onChange={(event) =>
              setDraft({
                ...draft,
                storageLocation: event.target.value as PantryStorageLocation,
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
            label="Category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as PantryItemInput['category'] })
            }
          >
            {Object.entries(pantryCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField
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
            label="Unit"
            optional
            value={draft.unit ?? ''}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.available}
              onChange={(event) => setDraft({ ...draft, available: event.target.checked })}
            />
            Available now
          </label>
          <Button type="submit" busy={saving}>
            {editingId ? 'Save item' : 'Add item'}
          </Button>
        </form>
      </Panel>

      <Panel>
        <div className="pantry-filters">
          <TextField
            label="Search staples"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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
      </Panel>

      {filteredItems.length === 0 ? (
        <Panel>
          <p>
            {items.length === 0
              ? 'Add your first household staple.'
              : 'No staples match those filters.'}
          </p>
        </Panel>
      ) : null}

      {(Object.keys(pantryStorageLocationLabels) as PantryStorageLocation[]).map(
        (storageLocation) => {
          const locationItems = grouped[storageLocation] ?? []
          if (locationItems.length === 0) return null
          return (
            <section
              className="pantry-section"
              key={storageLocation}
              aria-labelledby={`pantry-${storageLocation}`}
            >
              <h2 id={`pantry-${storageLocation}`}>
                {pantryStorageLocationLabels[storageLocation]}
              </h2>
              <div className="pantry-grid">
                {locationItems.map((item) => (
                  <article className="pantry-card" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {pantryCategoryLabels[item.category]} ·{' '}
                        {pantryStorageLocationLabels[item.storageLocation]}
                      </p>
                    </div>
                    <p className="pantry-quantity">
                      {item.quantity === null
                        ? 'Quantity not set'
                        : `${item.quantity} ${item.unit ?? ''}`.trim()}
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void toggleAvailability(item)}
                    >
                      {item.available ? 'Mark out of stock' : 'Mark available'}
                    </Button>
                    <div className="pantry-actions">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          setEditingId(item.id)
                          setDraft({
                            name: item.name,
                            category: item.category,
                            storageLocation: item.storageLocation,
                            quantity: item.quantity,
                            unit: item.unit,
                            available: item.available,
                          })
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="quiet" type="button" onClick={() => void remove(item)}>
                        Remove
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        },
      )}
    </main>
  )
}
