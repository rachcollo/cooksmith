import { useCallback, useEffect, useRef, useState } from 'react'
import { useShoppingRepository } from '../../app/shopping/shoppingContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { classifyPantryItem } from '../../domain/pantry/classification'
import {
  PutAwayReviewError,
  groupPutAwaySources,
  type PutAwayReview,
  type PutAwaySource,
} from '../../domain/shopping/putAway'

export function ShoppingPutAway({
  householdId,
  refreshKey,
  onApplied,
}: {
  householdId: string
  refreshKey: string
  onApplied: () => void
}) {
  const repository = useShoppingRepository()
  const [sources, setSources] = useState<PutAwaySource[]>([])
  const [review, setReview] = useState<PutAwayReview[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [attemptLocked, setAttemptLocked] = useState(false)
  const readVersion = useRef(0)
  const lock = useRef(false)
  const attempt = useRef<{ id: string; key: string } | null>(null)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    let current = true
    const version = ++readVersion.current
    if (!repository.listPutAway) return
    void repository
      .listPutAway(householdId)
      .then((rows) => {
        if (current && version === readVersion.current) setSources(rows)
      })
      .catch(() => {
        if (current && version === readVersion.current)
          setMessage('Could not check bought items for Pantry. Refresh to retry.')
      })
    return () => {
      current = false
    }
  }, [repository, householdId, refreshKey])
  const openReview = useCallback(async () => {
    if (lock.current || !repository.listPutAway) return
    lock.current = true
    const version = ++readVersion.current
    setBusy(true)
    setMessage(null)
    try {
      const next = await repository.listPutAway(householdId)
      if (!active.current || version !== readVersion.current) return
      setSources(next)
      attempt.current = null
      setAttemptLocked(false)
      if (next.length) setReview(groupPutAwaySources(next))
      else setMessage('All bought items have already been put away.')
    } catch {
      if (active.current) setMessage('Could not check bought items. Try again.')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }, [householdId, repository])
  useEffect(() => {
    // Existing Pantry navigation reaches the same reviewed, server-checked flow.
    const open = () => {
      window.sessionStorage.removeItem('cooksmith:open-pantry-restock')
      void openReview()
    }
    window.addEventListener('cooksmith:open-pantry-restock', open)
    if (window.sessionStorage.getItem('cooksmith:open-pantry-restock') === 'true') open()
    return () => window.removeEventListener('cooksmith:open-pantry-restock', open)
  }, [openReview])
  async function apply() {
    if (lock.current || !review || !repository.putAway) return
    const selected = review.filter((row) => row.included)
    if (!selected.length) return
    if (selected.some((row) => !row.name.trim() || row.name.trim().length > 100)) {
      setMessage('Use an item name between 1 and 100 characters.')
      return
    }
    const choices = selected.map((row) => {
      const classification = classifyPantryItem(row.name)
      return {
        name: row.name.trim(),
        sources: row.sources.map(({ key, token }) => ({ key, token })),
        category: classification.category,
        storageLocation: classification.storageLocation,
      }
    })
    const key = JSON.stringify(choices)
    setAttemptLocked(true)
    if (attempt.current?.key !== key) attempt.current = { id: crypto.randomUUID(), key }
    lock.current = true
    setBusy(true)
    setMessage(null)
    try {
      const result = await repository.putAway(householdId, attempt.current.id, choices)
      if (!active.current) return
      // The transaction has committed. A later refresh failure must not imply no stock changed.
      setReview(null)
      ++readVersion.current
      attempt.current = null
      setAttemptLocked(false)
      const appliedKeys = new Set(
        selected.flatMap((row) => row.sources.map((source) => source.key)),
      )
      setSources((rows) => rows.filter((source) => !appliedKeys.has(source.key)))
      setMessage(
        result.pantryItems
          ? `${result.pantryItems} Pantry ${result.pantryItems === 1 ? 'item is' : 'items are'} now available.${result.alreadyAppliedSources ? ' Some purchases had already been put away.' : ''}`
          : 'These purchases had already been put away. Pantry was not changed again.',
      )
      onApplied()
    } catch (error) {
      if (active.current) {
        if (error instanceof PutAwayReviewError) {
          attempt.current = null
          setAttemptLocked(false)
          setMessage(error.message)
        } else {
          setMessage(
            'Could not confirm put-away. Retry unchanged safely, or close and reopen to check the latest purchases. Your selection is applied together.',
          )
        }
      }
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  if (!repository.listPutAway || !repository.putAway) return null
  return (
    <section aria-label="Put shopping away">
      {sources.length ? (
        <Button variant="secondary" disabled={busy} onClick={() => void openReview()}>
          Put shopping away
        </Button>
      ) : null}
      {!review && message ? <p role="status">{message}</p> : null}
      {review ? (
        <Dialog
          open
          title="Put shopping away"
          description="Review bought items from all shopping periods. Marks matching Pantry items available without changing quantities. Your Shopping history is kept."
          onOpenChange={(open) => {
            if (!open && !busy) setReview(null)
          }}
        >
          <form
            className="pantry-form"
            onSubmit={(event) => {
              event.preventDefault()
              void apply()
            }}
          >
            {review.map((row, index) => (
              <div key={row.id} className="reconciliation-item">
                <label>
                  <input
                    type="checkbox"
                    checked={row.included}
                    disabled={busy || attemptLocked}
                    onChange={(event) =>
                      setReview((rows) =>
                        rows!.map((r, i) =>
                          i === index ? { ...r, included: event.target.checked } : r,
                        ),
                      )
                    }
                  />
                  Include {row.name}
                </label>
                <TextField
                  label={`Pantry name for ${row.id}`}
                  value={row.name}
                  maxLength={100}
                  required={row.included}
                  disabled={busy || attemptLocked || !row.included}
                  onChange={(event) =>
                    setReview((rows) =>
                      rows!.map((r, i) => (i === index ? { ...r, name: event.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
            <p className="form-hint">
              Unticked items stay available to review later. Cancel leaves Pantry and Shopping
              unchanged.
            </p>
            {message ? <p role="status">{message}</p> : null}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setReview(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !review.some((row) => row.included)}>
                {busy ? 'Putting away…' : 'Put selected items away'}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  )
}
