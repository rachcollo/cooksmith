import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFreezerRepository } from '../../app/freezer/freezerContext'
import { useRecipeRepository } from '../../app/recipes/recipeContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { TextArea } from '../../components/ui/TextArea'
import { SelectField } from '../../components/ui/SelectField'
import { toLocalIsoDate, formatDisplayDate } from '../../domain/meal-plans/week'
import type { FreezerMeal, FreezerMealInput } from '../../domain/freezer/types'
import { freezerMealInputSchema } from '../../domain/freezer/validation'
import type { Recipe } from '../../domain/recipes/types'

export function FreezerPanel({ householdId }: { householdId: string }) {
  const repository = useFreezerRepository()
  const recipesRepository = useRecipeRepository()
  const [rows, setRows] = useState<FreezerMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [archived, setArchived] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const operation = useRef<{ key: string; id: string } | null>(null)
  const [form, setForm] = useState<{
    id: string
    revision?: number
    input: FreezerMealInput
  } | null>(null)
  useEffect(() => {
    let active = true
    if (!repository) return
    void repository
      .list(householdId)
      .then((v) => {
        if (active) setRows(v)
      })
      .catch(() => {
        if (active) setMessage('Could not load prepared freezer meals. Use Refresh stock to retry.')
      })
    void recipesRepository
      .list(householdId)
      .then((v) => {
        if (active) setRecipes(v.filter((r) => r.scope !== 'private' && !r.archivedAt))
      })
      .catch(() => {
        if (active) setRecipes([])
      })
    return () => {
      active = false
    }
  }, [repository, recipesRepository, householdId])
  if (!repository) return null
  async function refresh() {
    const next = await repository!.list(householdId)
    setRows(next)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form || lock.current) return
    const parsed = freezerMealInputSchema.safeParse(form.input)
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the meal details.')
      return
    }
    const payload = {
      ...parsed.data,
      ...(form.revision === undefined ? {} : { revision: form.revision }),
    }
    const key = JSON.stringify({ id: form.id, payload })
    if (operation.current?.key !== key) operation.current = { key, id: crypto.randomUUID() }
    lock.current = true
    setBusy(true)
    setMessage(null)
    try {
      await repository!.command(householdId, {
        operationId: operation.current.id,
        action: form.revision === undefined ? 'create' : 'edit',
        freezerId: form.id,
        payload,
      })
      await refresh()
      setForm(null)
      operation.current = null
      setMessage('Freezer stock saved.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save stock. Retry or refresh to check the latest stock.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function archive(row: FreezerMeal) {
    if (lock.current) return
    if (
      !window.confirm(
        `${row.archivedAt ? 'Restore' : 'Archive'} ${row.name}? Existing reservations will be kept.`,
      )
    )
      return
    lock.current = true
    setBusy(true)
    try {
      await repository!.command(householdId, {
        operationId: crypto.randomUUID(),
        action: row.archivedAt ? 'restore' : 'archive',
        freezerId: row.id,
        payload: {},
      })
      await refresh()
      setMessage(
        row.archivedAt ? 'Meal restored.' : 'Meal archived. Existing reservations are kept.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update stock.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function update(input: Partial<FreezerMealInput>) {
    if (form) setForm({ ...form, input: { ...form.input, ...input } })
  }
  return (
    <section className="panel" aria-label="Prepared freezer meals">
      <h2>Prepared freezer meals</h2>
      <p>
        Meals already cooked and frozen. Reserve portions in Plan; ingredients will not be added to
        Shopping.
      </p>
      <div className="dialog-actions">
        <Button
          disabled={busy}
          onClick={() => {
            operation.current = null
            setMessage(null)
            setForm({
              id: crypto.randomUUID(),
              input: {
                name: '',
                portions: 1,
                frozenOn: toLocalIsoDate(new Date()),
                useFirstOn: null,
                notes: null,
                householdRecipeId: null,
                importedRecipeId: null,
              },
            })
          }}
        >
          Add freezer meal
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            void refresh()
              .then(() => {
                setForm(null)
                setMessage('Stock refreshed.')
              })
              .catch(() => setMessage('Could not refresh stock. Try again.'))
          }}
        >
          Refresh stock
        </Button>
        <Button variant="quiet" aria-pressed={archived} onClick={() => setArchived((v) => !v)}>
          {archived ? 'Show active meals' : 'Show archived meals'}
        </Button>
      </div>
      <p role="status">{form ? null : message}</p>
      {rows
        .filter((r) => Boolean(r.archivedAt) === archived)
        .map((row) => (
          <article key={row.id} className="pantry-card">
            <h3>{row.name}</h3>
            <p>
              {row.available} available · {row.reserved} reserved · {row.portions} in freezer
            </p>
            <p>
              {row.available === 0
                ? 'No portions available'
                : row.available === 1
                  ? 'Last available portion'
                  : null}
            </p>
            <p>
              Frozen {formatDisplayDate(row.frozenOn)}
              {row.useFirstOn ? `; use first ${formatDisplayDate(row.useFirstOn)}` : ''}
            </p>
            {row.notes ? <p>{row.notes}</p> : null}
            <div className="dialog-actions">
              <Button
                variant="quiet"
                disabled={busy}
                aria-label={`Edit freezer meal ${row.name}`}
                onClick={() => {
                  operation.current = null
                  setMessage(null)
                  setForm({ id: row.id, revision: row.revision, input: row })
                }}
              >
                Edit
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                aria-label={`${row.archivedAt ? 'Restore' : 'Archive'} freezer meal ${row.name}`}
                onClick={() => void archive(row)}
              >
                {row.archivedAt ? 'Restore' : 'Archive'}
              </Button>
            </div>
          </article>
        ))}
      {!rows.some((r) => Boolean(r.archivedAt) === archived) ? (
        <p>
          {archived
            ? 'No archived meals.'
            : 'No prepared meals yet. Add what is already in your freezer.'}
        </p>
      ) : null}
      {form ? (
        <Dialog
          open
          title={form.revision === undefined ? 'Add freezer meal' : 'Edit freezer meal'}
          onOpenChange={(open) => {
            if (!open && !busy) setForm(null)
          }}
        >
          <form className="pantry-form" onSubmit={(event) => void save(event)}>
            <TextField
              label="Meal name"
              value={form.input.name}
              required
              maxLength={120}
              onChange={(e) => update({ name: e.target.value })}
            />
            <TextField
              label="Portions in freezer"
              hint="Include reserved portions. Use whole portions or containers consistently."
              type="number"
              min={0}
              max={9999}
              step={1}
              value={form.input.portions}
              onChange={(e) => update({ portions: Number(e.target.value) })}
            />
            <TextField
              label="Frozen on"
              type="date"
              required
              value={form.input.frozenOn}
              onChange={(e) => update({ frozenOn: e.target.value })}
            />
            <TextField
              label="Use first on"
              type="date"
              optional
              min={form.input.frozenOn}
              value={form.input.useFirstOn ?? ''}
              onChange={(e) => update({ useFirstOn: e.target.value || null })}
            />
            <TextArea
              label="Freezer notes"
              optional
              maxLength={500}
              value={form.input.notes ?? ''}
              onChange={(e) => update({ notes: e.target.value || null })}
            />
            <SelectField
              label="Linked recipe"
              value={
                form.input.householdRecipeId
                  ? `household:${form.input.householdRecipeId}`
                  : form.input.importedRecipeId
                    ? `imported:${form.input.importedRecipeId}`
                    : ''
              }
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':')
                update({
                  householdRecipeId: kind === 'household' ? id! : null,
                  importedRecipeId: kind === 'imported' ? id! : null,
                })
              }}
            >
              <option value="">No linked recipe</option>
              {(form.input.householdRecipeId || form.input.importedRecipeId) &&
              !recipes.some(
                (r) => r.id === (form.input.householdRecipeId ?? form.input.importedRecipeId),
              ) ? (
                <option
                  value={
                    form.input.householdRecipeId
                      ? `household:${form.input.householdRecipeId}`
                      : `imported:${form.input.importedRecipeId}`
                  }
                >
                  Previously linked recipe (unavailable)
                </option>
              ) : null}
              {recipes.map((r) => (
                <option
                  key={`${r.scope}:${r.id}`}
                  value={`${r.scope === 'public' ? 'imported' : 'household'}:${r.id}`}
                >
                  {r.name} ({r.scope === 'public' ? 'shared' : 'household'})
                </option>
              ))}
            </SelectField>
            <p className="form-hint">Linking a recipe does not add its ingredients to Shopping.</p>
            <p role="status">{message}</p>
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save freezer meal'}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  )
}
