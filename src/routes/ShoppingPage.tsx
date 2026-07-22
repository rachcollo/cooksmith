import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'

import { useOnboarding } from '../app/onboarding/onboardingContext'
import { usePantryRepository } from '../app/pantry/pantryContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { useShoppingRepository } from '../app/shopping/shoppingContext'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextField } from '../components/ui/TextField'
import {
  shoppingCategoryLabels,
  type ShoppingCategory,
  type ShoppingItem,
  type ShoppingItemInput,
} from '../domain/shopping/types'
import { shoppingItemInputSchema } from '../domain/shopping/validationSchemas'
import type { PantryItem } from '../domain/pantry/types'
import {
  applyQuantityDelta,
  buildPutAwayProposal,
  type PantryReconciliationProposal,
} from '../domain/pantry/reconciliation'
import { buildPantryMatchIndex } from '../domain/shopping/pantryMatching'

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
  const pantryRepository = usePantryRepository()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [draft, setDraft] = useState<ShoppingItemInput>(emptyInput)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [editDraft, setEditDraft] = useState<ShoppingItemInput>(emptyInput)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openPantryInfoId, setOpenPantryInfoId] = useState<string | null>(null)
  const [pantryReviewOpen, setPantryReviewOpen] = useState(false)
  const [reviewedReconciliationKeys, setReviewedReconciliationKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const [reconcilingKey, setReconcilingKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!householdId) return
    Promise.allSettled([repository.list(householdId), pantryRepository.list(householdId)])
      .then(([shoppingResult, pantryResult]) => {
        if (!active) return
        if (shoppingResult.status === 'rejected') throw shoppingResult.reason
        setItems(shoppingResult.value)
        setPantryItems(
          pantryResult.status === 'fulfilled'
            ? pantryResult.value.filter(
                (item) => item.householdId === householdId && item.available,
              )
            : [],
        )
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
  }, [householdId, pantryRepository, repository])

  useEffect(() => {
    if (!openPantryInfoId) return
    function closeOnOutsidePress(event: PointerEvent) {
      const target = event.target
      if (
        target instanceof Element &&
        target.closest(`[data-pantry-match-info="${openPantryInfoId}"]`)
      ) {
        return
      }
      setOpenPantryInfoId(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [openPantryInfoId])

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
  const pantryMatches = useMemo(
    () => buildPantryMatchIndex(items, pantryItems),
    [items, pantryItems],
  )
  const putAwayProposals = useMemo(
    () =>
      completed.map((candidate) =>
        buildPutAwayProposal(candidate, pantryItems, reviewedReconciliationKeys),
      ),
    [completed, pantryItems, reviewedReconciliationKeys],
  )
  const actionablePutAwayProposals = putAwayProposals.filter(
    (proposal) => proposal.kind === 'create' || proposal.kind === 'increment',
  )
  const attentionPutAwayProposals = putAwayProposals.filter(
    (proposal): proposal is Extract<PantryReconciliationProposal, { kind: 'skip' }> =>
      proposal.kind === 'skip' && proposal.reason !== 'already-reviewed',
  )
  const reviewedPutAwayCount = putAwayProposals.filter(
    (proposal) => proposal.kind === 'skip' && proposal.reason === 'already-reviewed',
  ).length
  const createPutAwayCount = actionablePutAwayProposals.filter(
    (proposal) => proposal.kind === 'create',
  ).length
  const updatePutAwayCount = actionablePutAwayProposals.filter(
    (proposal) => proposal.kind === 'increment',
  ).length

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

  async function toggleCompleted(item: ShoppingItem) {
    const previous = items
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, completed: !item.completed } : candidate,
      ),
    )
    try {
      const saved = await repository.setCompleted(item.id, !item.completed)
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

  async function applyPutAwayProposal(proposal: PantryReconciliationProposal) {
    if (!householdId || proposal.kind === 'skip') return
    setReconcilingKey(proposal.idempotencyKey)
    setError(null)
    try {
      let saved: PantryItem | null
      if (pantryRepository.reconcile) {
        saved = await pantryRepository.reconcile(householdId, proposal)
      } else if (proposal.kind === 'create') {
        saved = await pantryRepository.create(householdId, proposal.input)
      } else {
        const pantryItem = pantryItems.find((item) => item.id === proposal.pantryItemId)
        if (!pantryItem) throw new Error('Cooksmith could not find that pantry item.')
        saved = await pantryRepository.update(
          proposal.pantryItemId,
          applyQuantityDelta(pantryItem, proposal.quantity),
        )
      }
      if (saved) {
        setPantryItems((current) => [...current.filter((item) => item.id !== saved.id), saved])
      }
      setReviewedReconciliationKeys((current) => new Set(current).add(proposal.idempotencyKey))
    } catch (putAwayError) {
      setError(
        putAwayError instanceof Error
          ? putAwayError.message
          : 'Cooksmith could not update Pantry from that shopping item.',
      )
    } finally {
      setReconcilingKey(null)
    }
  }

  async function updatePantryFromShopping() {
    if (actionablePutAwayProposals.length === 0) return
    for (const proposal of actionablePutAwayProposals) {
      await applyPutAwayProposal(proposal)
    }
  }

  function markAttentionReviewed() {
    setReviewedReconciliationKeys((current) => {
      const next = new Set(current)
      for (const proposal of attentionPutAwayProposals) next.add(proposal.idempotencyKey)
      return next
    })
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
        <div className="shopping-title-row">
          <h1>Shopping</h1>
          <p className="shopping-summary" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true">
              <strong>{outstanding.length}</strong> left to buy
            </span>
            <span className="visually-hidden">
              {outstanding.length} {outstanding.length === 1 ? 'item' : 'items'} left to buy
            </span>
          </p>
        </div>
        <p>Add what your household needs, then tick items off as you shop.</p>
      </header>

      {error ? <ErrorState title="Shopping needs a quick check" message={error} /> : null}

      {putAwayProposals.length > 0 ? (
        <Panel className="shopping-complete-panel">
          <div>
            <h2>Shopping complete?</h2>
            <p>
              Review pantry updates before anything changes: {createPutAwayCount} new,{' '}
              {updatePutAwayCount} updated
              {attentionPutAwayProposals.length > 0
                ? `, ${attentionPutAwayProposals.length} needing attention`
                : ''}
              .
            </p>
          </div>
          <Button type="button" onClick={() => setPantryReviewOpen(true)}>
            Review pantry updates
          </Button>
        </Panel>
      ) : null}

      <Panel className="shopping-add-panel">
        <h2 className="visually-hidden">Add an item</h2>
        <form
          className="shopping-form shopping-quick-add"
          onSubmit={(event) => void addItem(event)}
        >
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
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          <Button busy={saving} disabled={!draft.name.trim()} type="submit">
            <Plus aria-hidden="true" /> Add
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
                  editDraft={editDraft}
                  editErrors={editErrors}
                  editing={editing?.id === item.id}
                  item={item}
                  pantryMatch={pantryMatches.get(item.id)?.state === 'match'}
                  pantryInfoOpen={openPantryInfoId === item.id}
                  key={item.id}
                  saving={saving}
                  onCancelEdit={() => setEditing(null)}
                  onEditDraftChange={setEditDraft}
                  onEdit={openEdit}
                  onRemove={(candidate) => void removeItem(candidate)}
                  onPantryInfoChange={(open) => setOpenPantryInfoId(open ? item.id : null)}
                  onSaveEdit={(event) => void saveEdit(event)}
                  onToggle={(candidate) => void toggleCompleted(candidate)}
                />
              ))}
            </ul>
          </section>
        )
      })}

      {pantryReviewOpen ? (
        <Dialog
          open
          title="Update Pantry from shopping"
          description="Cooksmith will only change Pantry after you confirm these completed shopping items."
          onOpenChange={(open) => setPantryReviewOpen(open)}
        >
          <div className="pantry-update-dialog">
            <div className="pantry-update-summary" aria-label="Pantry update summary">
              <span>
                <strong>{createPutAwayCount}</strong> new items
              </span>
              <span>
                <strong>{updatePutAwayCount}</strong> updated items
              </span>
              <span>
                <strong>{attentionPutAwayProposals.length}</strong> need attention
              </span>
            </div>

            {actionablePutAwayProposals.length > 0 ? (
              <section>
                <h3>Ready to update</h3>
                <ul className="reconciliation-list">
                  {actionablePutAwayProposals.map((proposal) => (
                    <li key={proposal.idempotencyKey} className="reconciliation-item">
                      <div>
                        <strong>{proposal.sourceText}</strong>
                        <p>
                          {proposal.kind === 'increment'
                            ? `Update ${proposal.pantryItemName}`
                            : `Add ${proposal.input.name} to Pantry`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {attentionPutAwayProposals.length > 0 ? (
              <section>
                <h3>Needs attention</h3>
                <p className="form-hint">
                  These items were not guessed because the pantry match or quantity was unclear.
                </p>
                <ul className="reconciliation-list">
                  {attentionPutAwayProposals.map((proposal) => (
                    <li key={proposal.idempotencyKey} className="reconciliation-item">
                      <div>
                        <strong>{proposal.sourceText}</strong>
                        <p>
                          {proposal.reason === 'ambiguous-match'
                            ? 'Multiple pantry items could match.'
                            : proposal.reason === 'incompatible-quantity'
                              ? 'The quantity or unit does not match an existing pantry item.'
                              : 'Review this item manually.'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {reviewedPutAwayCount > 0 ? (
              <p className="form-hint">
                {reviewedPutAwayCount} completed item has already been reviewed.
              </p>
            ) : null}

            <div className="dialog-actions">
              {attentionPutAwayProposals.length > 0 ? (
                <Button type="button" variant="secondary" onClick={markAttentionReviewed}>
                  Mark attention reviewed
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setPantryReviewOpen(false)}>
                Not now
              </Button>
              <Button
                type="button"
                busy={reconcilingKey !== null}
                disabled={actionablePutAwayProposals.length === 0}
                onClick={() => void updatePantryFromShopping()}
              >
                Update the pantry
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {completed.length > 0 ? (
        <section
          className="shopping-category shopping-completed"
          aria-labelledby="shopping-completed"
        >
          <h2 id="shopping-completed">Done</h2>
          <ul className="shopping-list">
            {completed.map((item) => (
              <ShoppingItemRow
                editDraft={editDraft}
                editErrors={editErrors}
                editing={editing?.id === item.id}
                item={item}
                pantryMatch={pantryMatches.get(item.id)?.state === 'match'}
                pantryInfoOpen={openPantryInfoId === item.id}
                key={item.id}
                saving={saving}
                onCancelEdit={() => setEditing(null)}
                onEditDraftChange={setEditDraft}
                onEdit={openEdit}
                onRemove={(candidate) => void removeItem(candidate)}
                onPantryInfoChange={(open) => setOpenPantryInfoId(open ? item.id : null)}
                onSaveEdit={(event) => void saveEdit(event)}
                onToggle={(candidate) => void toggleCompleted(candidate)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}

function ShoppingItemRow({
  editDraft,
  editErrors,
  editing,
  item,
  pantryMatch,
  pantryInfoOpen,
  saving,
  onCancelEdit,
  onEdit,
  onEditDraftChange,
  onRemove,
  onPantryInfoChange,
  onSaveEdit,
  onToggle,
}: {
  editDraft: ShoppingItemInput
  editErrors: FieldErrors
  editing: boolean
  item: ShoppingItem
  pantryMatch: boolean
  pantryInfoOpen: boolean
  saving: boolean
  onCancelEdit: () => void
  onEdit: (item: ShoppingItem) => void
  onEditDraftChange: (draft: ShoppingItemInput) => void
  onRemove: (item: ShoppingItem) => void
  onPantryInfoChange: (open: boolean) => void
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => void
  onToggle: (item: ShoppingItem) => void
}) {
  const amount =
    item.quantity === null ? null : `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
  return (
    <li
      className={`shopping-item${item.completed ? ' shopping-item-completed' : ''}${pantryMatch ? ' shopping-item-pantry-match' : ''}`}
      data-pantry-match-info={item.id}
    >
      <button
        aria-label={`${item.completed ? 'Mark as needed' : 'Mark as done'}: ${item.name}`}
        className="shopping-check"
        type="button"
        onClick={() => onToggle(item)}
      >
        {item.completed ? <Check aria-hidden="true" /> : null}
      </button>
      {editing ? (
        <form className="shopping-inline-edit" onSubmit={onSaveEdit}>
          <label className="visually-hidden" htmlFor={`shopping-quantity-${item.id}`}>
            Quantity
          </label>
          <input
            id={`shopping-quantity-${item.id}`}
            inputMode="decimal"
            value={editDraft.quantity === null ? '' : String(editDraft.quantity)}
            onChange={(event) =>
              onEditDraftChange({
                ...editDraft,
                quantity: event.target.value.trim() === '' ? null : Number(event.target.value),
              })
            }
          />
          <label className="visually-hidden" htmlFor={`shopping-name-${item.id}`}>
            Item name
          </label>
          <input
            autoFocus
            id={`shopping-name-${item.id}`}
            required
            value={editDraft.name}
            onChange={(event) => onEditDraftChange({ ...editDraft, name: event.target.value })}
          />
          <button
            aria-label={`Save changes to ${item.name}`}
            className="shopping-icon-action"
            disabled={saving || !editDraft.name.trim()}
            type="submit"
          >
            <Check aria-hidden="true" />
          </button>
          <button
            aria-label={`Cancel editing ${item.name}`}
            className="shopping-icon-action"
            disabled={saving}
            type="button"
            onClick={onCancelEdit}
          >
            <X aria-hidden="true" />
          </button>
          {editErrors.name || editErrors.quantity || editErrors.form ? (
            <p className="form-error" role="alert">
              {editErrors.name ?? editErrors.quantity ?? editErrors.form}
            </p>
          ) : null}
        </form>
      ) : (
        <>
          <div className="shopping-item-copy">
            {amount ? <span>{amount}</span> : null}
            <strong>{item.name}</strong>
          </div>
          <div className="shopping-pantry-info" aria-hidden={pantryMatch ? undefined : true}>
            {pantryMatch ? (
              <>
                <button
                  aria-describedby={pantryInfoOpen ? `pantry-match-message-${item.id}` : undefined}
                  aria-expanded={pantryInfoOpen}
                  aria-label={`Why should I check my pantry for ${item.name}?`}
                  className="shopping-pantry-info-button"
                  type="button"
                  onBlur={(event) => {
                    if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                      onPantryInfoChange(false)
                    }
                  }}
                  onClick={() => onPantryInfoChange(true)}
                  onFocus={() => onPantryInfoChange(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      onPantryInfoChange(false)
                    }
                  }}
                  onMouseEnter={() => onPantryInfoChange(true)}
                  onMouseLeave={() => onPantryInfoChange(false)}
                >
                  ?
                </button>
                {pantryInfoOpen ? (
                  <span
                    className="shopping-pantry-tooltip"
                    id={`pantry-match-message-${item.id}`}
                    role="tooltip"
                  >
                    Check your pantry — you might already have this item, and we hate wasting food
                    and money!
                  </span>
                ) : null}
              </>
            ) : null}
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
        </>
      )}
    </li>
  )
}
