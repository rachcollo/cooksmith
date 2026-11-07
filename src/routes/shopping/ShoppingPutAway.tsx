import { useCallback, useEffect, useRef, useState } from 'react'
import { useShoppingRepository } from '../../app/shopping/shoppingContext'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/TextField'
import { classifyPantryItem } from '../../domain/pantry/classification'
import {
  PutAwayReviewError,
  groupPutAwaySources,
  combinePutAwayChoices,
  correctPutAwayName,
  correctPutAwayAmount,
  selectPutAwayPantry,
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
  const [showAll, setShowAll] = useState(false)
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
      setShowAll(false)
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
    if (selected.some((row) => row.attention)) {
      setMessage('Resolve the items that need attention, or leave them for later.')
      return
    }
    const choices = selected.map((row) => {
      const classification = classifyPantryItem(row.name)
      const targetName = row.pantryName ?? row.name.trim()
      const target = row.sources
        .flatMap((source) => source.pantryItems ?? [])
        .find((item) => item.name.trim().toLowerCase() === targetName.toLowerCase())
      return {
        name: row.pantryName ?? row.name.trim(),
        quantity: row.quantity,
        ...(row.quantityUntracked ? { quantityUntracked: true } : {}),
        unit: row.unit,
        pantryUpdatedAt: target?.updatedAt ?? null,
        sources: row.sources.map(({ key, token }) => ({ key, token })),
        category: classification.category,
        storageLocation: classification.storageLocation,
      }
    })
    let combinedChoices
    try {
      combinedChoices = combinePutAwayChoices(choices)
    } catch (error) {
      setMessage(error instanceof PutAwayReviewError ? error.message : 'Check the selected items.')
      return
    }
    const key = JSON.stringify(combinedChoices)
    setAttemptLocked(true)
    if (attempt.current?.key !== key) attempt.current = { id: crypto.randomUUID(), key }
    lock.current = true
    setBusy(true)
    setMessage(null)
    try {
      const result = await repository.putAway(householdId, attempt.current.id, combinedChoices)
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
  const readyCount = review?.filter((row) => row.included && !row.attention).length ?? 0
  const attentionCount = review?.filter((row) => row.attention).length ?? 0
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
          description="The ready items are handled together. Only items that need your attention are shown below."
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
            <p className="put-away-summary" role="status">
              {readyCount} {readyCount === 1 ? 'item ready' : 'items ready'}.
              {attentionCount
                ? ` ${attentionCount} ${attentionCount === 1 ? 'needs' : 'need'} attention.`
                : ' Nothing needs checking.'}
            </p>
            <Button
              type="button"
              variant="quiet"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll
                ? 'Show only items needing attention'
                : `View all ${review.length} ${review.length === 1 ? 'item' : 'items'}`}
            </Button>
            {review.map((row, index) =>
              !showAll && !row.attention && !row.editing ? null : (
                <div key={row.id} className="put-away-row">
                  <label className="put-away-choice">
                    <input
                      type="checkbox"
                      aria-label={`Include ${row.name}`}
                      checked={row.included}
                      disabled={busy || attemptLocked || Boolean(row.attention)}
                      onChange={(event) =>
                        setReview((rows) =>
                          rows!.map((r, i) =>
                            i === index ? { ...r, included: event.target.checked } : r,
                          ),
                        )
                      }
                    />
                    <span>
                      <strong>{row.name}</strong>
                      {row.quantity !== null ? (
                        <small>
                          {row.quantity} {row.unit}
                          {row.quantityUntracked ? ' · extra stock stays untracked' : ''}
                        </small>
                      ) : null}
                      <small>
                        {row.attention === 'ingredient'
                          ? 'Which ingredient did you buy? Choose a name or leave it for later.'
                          : row.attention === 'pantry-match'
                            ? 'Choose the Pantry item to update.'
                            : row.attention === 'unit-conflict'
                              ? 'The bought amount and Pantry unit cannot be added safely.'
                              : row.pantryName
                                ? 'Recognised in Pantry'
                                : 'Add to Pantry'}
                      </small>
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="quiet"
                    disabled={busy || attemptLocked}
                    aria-label={row.editing ? `Done editing ${row.name}` : `Change ${row.name}`}
                    aria-expanded={row.editing}
                    onClick={() =>
                      setReview((rows) =>
                        rows!.map((r, i) => (i === index ? { ...r, editing: !r.editing } : r)),
                      )
                    }
                  >
                    {row.editing ? 'Done' : 'Change'}
                  </Button>
                  {row.attention === 'unit-conflict' ? (
                    <div className="put-away-matches">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || attemptLocked}
                        onClick={() =>
                          setReview((rows) =>
                            rows!.map((r, i) =>
                              i === index
                                ? {
                                    ...correctPutAwayAmount(r, null, null),
                                    quantityUntracked: true,
                                    editing: true,
                                  }
                                : r,
                            ),
                          )
                        }
                      >
                        Keep available without a total
                      </Button>
                    </div>
                  ) : null}
                  {row.sources.some((source) => source.hasConsumedStock) ? (
                    <p className="form-hint">
                      Some of this purchase has already been used in a meal. Check only what is left
                      to put away, excluding what you have already used.
                    </p>
                  ) : null}
                  {row.attention === 'pantry-match' ? (
                    <div className="put-away-matches" aria-label={`Pantry matches for ${row.name}`}>
                      {row.matches.map((target) => (
                        <Button
                          key={target.id}
                          type="button"
                          variant="secondary"
                          disabled={busy || attemptLocked}
                          onClick={() =>
                            setReview((rows) =>
                              rows!.map((r, i) =>
                                i === index
                                  ? { ...selectPutAwayPantry(r, target), editing: true }
                                  : r,
                              ),
                            )
                          }
                        >
                          Use {target.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {row.editing ||
                  row.attention === 'ingredient' ||
                  row.attention === 'unit-conflict' ? (
                    <div className="put-away-fields">
                      <TextField
                        label="Ingredient"
                        aria-label={`Ingredient for ${row.id}`}
                        value={row.pantryName ?? row.name}
                        maxLength={100}
                        required={row.included}
                        disabled={busy || attemptLocked}
                        onChange={(event) =>
                          setReview((rows) =>
                            rows!.map((r, i) =>
                              i === index
                                ? { ...correctPutAwayName(r, event.target.value), editing: true }
                                : r,
                            ),
                          )
                        }
                      />
                      {row.sources.every((source) => source.key.startsWith('p:')) ? (
                        <>
                          <TextField
                            label="Amount left"
                            aria-label={`Amount left for ${row.id}`}
                            type="number"
                            min="0"
                            max="99999"
                            step="0.01"
                            value={row.quantity ?? ''}
                            disabled={busy || attemptLocked}
                            onChange={(event) =>
                              setReview((rows) =>
                                rows!.map((r, i) =>
                                  i === index
                                    ? correctPutAwayAmount(
                                        r,
                                        event.target.value === ''
                                          ? null
                                          : Number(event.target.value),
                                        r.unit,
                                      )
                                    : r,
                                ),
                              )
                            }
                          />
                          <TextField
                            label="Unit"
                            aria-label={`Unit for ${row.id}`}
                            value={row.unit ?? ''}
                            disabled={busy || attemptLocked}
                            onChange={(event) =>
                              setReview((rows) =>
                                rows!.map((r, i) =>
                                  i === index
                                    ? correctPutAwayAmount(
                                        r,
                                        r.quantity,
                                        event.target.value || null,
                                      )
                                    : r,
                                ),
                              )
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ),
            )}
            <p className="form-hint">
              {review.some((row) => row.sources.some((source) => source.key.startsWith('p:')))
                ? 'Known remaining amounts are added once. Unmeasured stock stays untracked.'
                : 'These older purchases mark Pantry items available without inventing quantities.'}{' '}
              Items left out can be put away later.
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
              <Button type="submit" disabled={busy || !readyCount}>
                {busy
                  ? 'Putting away…'
                  : `Put away ${readyCount} ${readyCount === 1 ? 'item' : 'items'}`}
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </section>
  )
}
