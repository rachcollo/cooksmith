import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFreezerRepository } from '../../app/freezer/freezerContext'
import { useRecipeRepository } from '../../app/recipes/recipeContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { TextArea } from '../../components/ui/TextArea'
import { MealSearchField } from '../meal-plans/MealSearchField'
import { toLocalIsoDate, formatDisplayDate } from '../../domain/meal-plans/week'
import type { FreezerMeal, FreezerMealInput } from '../../domain/freezer/types'
import { freezerMealInputSchema } from '../../domain/freezer/validation'
import type { Recipe } from '../../domain/recipes/types'

export function FreezerPanel({ householdId }: { householdId: string }) {
  const repository = useFreezerRepository()
  const recipesRepository = useRecipeRepository()
  const [rows, setRows] = useState<FreezerMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [recipesError, setRecipesError] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const stockRequest = useRef(0)
  const mounted = useRef(true)
  const operation = useRef<{ key: string; id: string } | null>(null)
  const [form, setForm] = useState<{
    id: string
    revision?: number
    input: FreezerMealInput
  } | null>(null)
  useEffect(() => {
    let active = true
    mounted.current = true
    if (!repository) return
    const request = ++stockRequest.current
    void repository
      .list(householdId)
      .then((v) => {
        if (active && request === stockRequest.current) {
          setRows(v)
          setLoaded(true)
          setStockError(null)
        }
      })
      .catch(() => {
        if (active && request === stockRequest.current)
          setStockError('Could not load freezer meals. Try again.')
      })
    void recipesRepository
      .list(householdId)
      .then((v) => {
        if (active) {
          setRecipes(v.filter((r) => r.scope !== 'private' && !r.archivedAt))
          setRecipesLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setRecipesError('Could not load recipes. You can still add a manual meal.')
          setRecipesLoading(false)
        }
      })
    function reload() {
      if (lock.current || document.visibilityState === 'hidden') return
      const request = ++stockRequest.current
      void repository!
        .list(householdId)
        .then((next) => {
          if (active && request === stockRequest.current) {
            setRows(next)
            setLoaded(true)
            setStockError(null)
          }
        })
        .catch(() => {
          if (active && request === stockRequest.current)
            setStockError('Could not refresh freezer meals. Try again.')
        })
    }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', reload)
    return () => {
      active = false
      mounted.current = false
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', reload)
    }
  }, [repository, recipesRepository, householdId])
  if (!repository) return null
  async function refresh() {
    const request = ++stockRequest.current
    const next = await repository!.list(householdId)
    if (mounted.current && request === stockRequest.current) {
      setRows(next)
      setLoaded(true)
      setStockError(null)
    }
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
      setExpanded(true)
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
  const activeRows = rows.filter((row) => !row.archivedAt)
  const available = activeRows.reduce((sum, row) => sum + row.available, 0)
  return (
    <section className="freezer-panel" aria-label="Freezer meals">
      <div className="freezer-toolbar">
        <h2>
          <Button
            variant="quiet"
            aria-expanded={expanded}
            aria-controls="freezer-stock"
            onClick={() => setExpanded((value) => !value)}
          >
            <span>
              Freezer meals <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
              <small>
                {loaded
                  ? `${activeRows.length} ${activeRows.length === 1 ? 'meal' : 'meals'} · ${available} available`
                  : stockError
                    ? 'Stock unavailable'
                    : 'Loading stock…'}
              </small>
            </span>
          </Button>
        </h2>
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
          Add meal
        </Button>
      </div>
      {!form && message ? <p role="status">{message}</p> : null}
      {stockError ? <p role="alert">{stockError}</p> : null}
      {stockError ? (
        <Button
          variant="secondary"
          onClick={() =>
            void refresh()
              .then(() => setStockError(null))
              .catch(() => setStockError('Could not load freezer meals. Try again.'))
          }
        >
          Retry stock
        </Button>
      ) : null}
      <div id="freezer-stock" hidden={!expanded}>
        <p className="form-hint">
          Already cooked meals. Reserve portions in Plan without adding ingredients to Shopping.
        </p>
        <div className="dialog-actions">
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() =>
              void refresh()
                .then(() => setMessage('Stock refreshed.'))
                .catch(() => setMessage('Could not refresh stock. Try again.'))
            }
          >
            Refresh stock
          </Button>
          <Button
            variant="quiet"
            aria-pressed={archived}
            onClick={() => setArchived((value) => !value)}
          >
            {archived ? 'Show active meals' : 'Show archived meals'}
          </Button>
        </div>
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
      </div>
      {form ? (
        <Dialog
          open
          title={form.revision === undefined ? 'Add freezer meal' : 'Edit freezer meal'}
          onOpenChange={(open) => {
            if (!open && !busy) setForm(null)
          }}
        >
          <form className="pantry-form" onSubmit={(event) => void save(event)}>
            <MealSearchField
              label="Meal name"
              value={form.input.name}
              recipes={recipes}
              loading={recipesLoading}
              error={recipesError}
              disabled={busy}
              onQuery={(name) => update({ name, householdRecipeId: null, importedRecipeId: null })}
              onManual={(name) => update({ name, householdRecipeId: null, importedRecipeId: null })}
              onRecipe={(recipe) =>
                update({
                  name: recipe.name,
                  householdRecipeId: recipe.scope === 'public' ? null : recipe.id,
                  importedRecipeId: recipe.scope === 'public' ? recipe.id : null,
                })
              }
            />
            <p className="form-hint">
              {form.input.householdRecipeId || form.input.importedRecipeId
                ? 'Recipe linked. Its ingredients will not be added to Shopping.'
                : 'Save this name as a manual meal, or choose a recipe to link it.'}
            </p>
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
              label="Add to this day"
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
