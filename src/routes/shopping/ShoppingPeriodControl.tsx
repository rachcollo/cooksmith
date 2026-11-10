import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { startOfWeek } from '../../domain/meal-plans/week'
import {
  chooseShoppingPeriod,
  shoppingPresetLabels,
  validShoppingPeriod,
  type ShoppingPeriod,
  type ShoppingPeriodKind,
  type ShoppingPeriodView,
} from '../../domain/shopping/period'

export function ShoppingPeriodControl({
  view,
  busy,
  onSave,
}: {
  view: ShoppingPeriodView
  busy: boolean
  onSave: (period: ShoppingPeriod) => Promise<void>
}) {
  const [draft, setDraft] = useState({ ...view.period, kind: view.choice ?? view.period.kind })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const locked = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const [previousView, setPreviousView] = useState(view)
  if (view.period !== previousView.period || view.choice !== previousView.choice) {
    setPreviousView(view)
    setDraft({ ...view.period, kind: view.choice ?? view.period.kind })
  }
  async function save(period: ShoppingPeriod) {
    if (busy || locked.current) return
    if (!validShoppingPeriod(period)) {
      setError(
        'Choose valid dates in the same Monday-to-Sunday week, with the end on or after the start.',
      )
      return
    }
    locked.current = true
    setPending(true)
    setError(null)
    try {
      await onSave(period)
    } catch {
      if (active.current) {
        if (period.kind !== 'custom')
          setDraft({ ...view.period, kind: view.choice ?? view.period.kind })
        setError('Could not update the list. Your previous list is still available. Try again.')
      }
    } finally {
      locked.current = false
      if (active.current) setPending(false)
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    // Date inputs describe the chosen week, not the week in which Shopping was opened.
    void save({ ...draft, weekStart: draft.from ? startOfWeek(draft.from) : draft.weekStart })
  }
  return (
    <section
      aria-label="Shopping period"
      className="shopping-period-control"
      aria-busy={pending || busy}
    >
      <form onSubmit={submit}>
        <SelectField
          label="Buy for"
          value={draft.kind}
          disabled={busy || pending}
          onChange={(event) => {
            if (busy || locked.current) return
            const kind = event.target.value as ShoppingPeriodKind
            const next = kind === 'custom' ? { ...view.period, kind } : chooseShoppingPeriod(kind)
            setDraft(next)
            setError(null)
            if (next.kind !== 'custom') void save(next)
          }}
        >
          <option value="default">
            Household default ({shoppingPresetLabels[view.defaultKind ?? 'nextWeek']})
          </option>
          {Object.entries(shoppingPresetLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="custom">Custom dates</option>
        </SelectField>
        {draft.kind === 'custom' ? (
          <div className="shopping-custom-dates">
            <div className="form-grid">
              <TextField
                label="From date"
                type="date"
                value={draft.from}
                disabled={busy || pending}
                onChange={(event) => setDraft({ ...draft, from: event.target.value })}
              />
              <TextField
                label="To date"
                type="date"
                value={draft.to}
                disabled={busy || pending}
                onChange={(event) => setDraft({ ...draft, to: event.target.value })}
              />
            </div>
            <Button type="submit" disabled={busy || pending}>
              Save dates
            </Button>
          </div>
        ) : null}
      </form>
      <p className="form-hint" role="status">
        {pending || busy ? 'Updating list…' : view.description}
      </p>
      {view.notice ? <p className="form-hint">{view.notice}</p> : null}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </section>
  )
}
