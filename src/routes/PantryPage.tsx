import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { DocumentTitle } from '../app/router/DocumentTitle'
import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePantryRepository } from '../app/pantry/pantryContext'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { SelectField } from '../components/ui/SelectField'
import { TextField } from '../components/ui/TextField'
import { pantryItemInputSchema } from '../domain/pantry/validationSchemas'
import {
  pantryCategoryLabels,
  pantryStorageLabels,
  type PantryItem,
  type PantryItemInput,
} from '../domain/pantry/types'

const emptyInput: PantryItemInput = {
  name: '',
  category: 'staples',
  storageLocation: 'pantry',
  quantity: 1,
  unit: 'item',
  available: true,
}

export function PantryPage() {
  const { state } = useOnboarding()
  const repository = usePantryRepository()
  const householdId = state.householdId
  const [items, setItems] = useState<PantryItem[]>([])
  const [draft, setDraft] = useState<PantryItemInput>(emptyInput)
  const [editingId, setEditingId] = useState<string | null>(null)
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
        if (active) setError('We could not load your pantry. Try refreshing Cooksmith.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [householdId, repository])

  const grouped = useMemo(
    () =>
      items.reduce<Record<string, PantryItem[]>>((groups, item) => {
        const label = pantryStorageLabels[item.storageLocation]
        groups[label] = [...(groups[label] ?? []), item]
        return groups
      }, {}),
    [items],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!householdId) return
    const result = pantryItemInputSchema.safeParse(draft)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check the pantry item.')
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
          : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)),
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

  async function remove(item: PantryItem) {
    setError(null)
    await repository.remove(item.id)
    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    if (editingId === item.id) {
      setEditingId(null)
      setDraft(emptyInput)
    }
  }

  if (loading) return <LoadingState label="Loading your pantry" />

  return (
    <main className="page-stack">
      <DocumentTitle title="Pantry" />
      <header className="page-header">
        <p className="eyebrow">Your ingredients</p>
        <h1>Pantry</h1>
        <p>A private household list for everyday pantry, fridge and freezer staples.</p>
      </header>

      {error ? <ErrorState title="Pantry needs a quick check" message={error} /> : null}

      <Panel className="pantry-form-panel">
        <form className="pantry-form" onSubmit={(event) => void submit(event)}>
          <TextField
            label="Item name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <TextField
            label="Quantity"
            inputMode="decimal"
            value={String(draft.quantity)}
            onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })}
          />
          <TextField
            label="Unit"
            value={draft.unit}
            onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
          />
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
          <SelectField
            label="Stored in"
            value={draft.storageLocation}
            onChange={(event) =>
              setDraft({
                ...draft,
                storageLocation: event.target.value as PantryItemInput['storageLocation'],
              })
            }
          >
            {Object.entries(pantryStorageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
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

      {Object.entries(grouped).map(([location, locationItems]) => (
        <section className="pantry-section" key={location} aria-labelledby={`pantry-${location}`}>
          <h2 id={`pantry-${location}`}>{location}</h2>
          <div className="pantry-grid">
            {locationItems.map((item) => (
              <article className="pantry-card" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{pantryCategoryLabels[item.category]}</p>
                </div>
                <p className="pantry-quantity">
                  {item.quantity} {item.unit}
                </p>
                <span className={item.available ? 'badge badge-positive' : 'badge badge-neutral'}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
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
                  <Button
                    variant="quiet"
                    type="button"

                    onClick={() => void remove(item)}
                  >
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
