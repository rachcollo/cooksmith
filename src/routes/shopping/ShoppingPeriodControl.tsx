import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { addDays } from '../../domain/meal-plans/week'
import {
  chooseShoppingPeriod,
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
  const [draft, setDraft] = useState(view.period)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!validShoppingPeriod(draft)) {
      setError('Choose an end date on or after the start, within the active week.')
      return
    }
    setError(null)
    try {
      await onSave(draft)
    } catch {
      setError(
        'Could not save the shopping period. Your previous list is still available. Try again.',
      )
    }
  }
  return (
    <section aria-label="Shopping period" className="panel">
      <p>{view.description}</p>
      {view.notice ? <p role="status">{view.notice}</p> : null}
      <form onSubmit={(event) => void submit(event)}>
        <SelectField
          label="Buy for"
          value={draft.kind}
          disabled={busy}
          onChange={(event) => {
            setDraft(chooseShoppingPeriod(event.target.value as ShoppingPeriodKind))
            setError(null)
          }}
        >
          <option value="week">Full active week</option>
          <option value="next3">Next 3 planned meals</option>
          <option value="next5">Next 5 planned meals</option>
          <option value="custom">Custom dates in this week</option>
        </SelectField>
        {draft.kind === 'custom' ? (
          <div className="form-grid">
            <TextField
              label="From date"
              type="date"
              min={draft.weekStart}
              max={addDays(draft.weekStart, 6)}
              value={draft.from}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
            <TextField
              label="To date"
              type="date"
              min={draft.weekStart}
              max={addDays(draft.weekStart, 6)}
              value={draft.to}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving period…' : 'Apply period'}
        </Button>
        <p role="status">{error}</p>
      </form>
      <p className="field-hint">
        Manual items and restock staples stay on your list. Bought status and adjusted amounts stay
        attached to the saved purchase when you change dates.
      </p>
    </section>
  )
}
