import { MeasurementSelect } from '../components/ui/MeasurementSelect'
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
  numericQuantity,
  quantitiesAreCompatible,
  type PantryReconciliationProposal,
} from '../domain/pantry/reconciliation'
import { classifyPantryItem } from '../domain/pantry/classification'
import { buildPantryMatchIndex, normalisePantryMatchName } from '../domain/shopping/pantryMatching'

import {
  groupShoppingPurchases,
  purchaseAmount,
  purchaseDisplayQuantity,
  type ShoppingPurchase,
  type PurchaseAmount,
} from '../domain/shopping/purchaseGroups'

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
  const [purchaseEdit, setPurchaseEdit] = useState<{
    purchase: ShoppingPurchase
    combineWithPlan?: boolean
    name: string
    amounts: PurchaseAmount[]
  } | null>(null)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [editDraft, setEditDraft] = useState<ShoppingItemInput>(emptyInput)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openPantryInfoId, setOpenPantryInfoId] = useState<string | null>(null)
  const [pantryReviewOpen, setPantryReviewOpen] = useState(false)
  const [attentionResolutions, setAttentionResolutions] = useState<Record<string, string>>({})
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

  useEffect(() => {
    function openPantryReview() {
      window.sessionStorage.removeItem('cooksmith:open-pantry-restock')
      setPantryReviewOpen(true)
    }
    window.addEventListener('cooksmith:open-pantry-restock', openPantryReview)
    if (window.sessionStorage.getItem('cooksmith:open-pantry-restock') === 'true') {
      openPantryReview()
    }
    return () => window.removeEventListener('cooksmith:open-pantry-restock', openPantryReview)
  }, [])

  const purchases = useMemo(
    () => groupShoppingPurchases(items.filter((item) => item.householdId === householdId)),
    [items, householdId],
  )
  const outstanding = purchases.filter((item) => !item.completed)
  const completedPurchases = purchases.filter((item) => item.completed)
  const completed = items.filter((item) => item.completed && item.householdId === householdId)
  const grouped = useMemo(
    () =>
      outstanding.reduce<Partial<Record<ShoppingCategory, ShoppingPurchase[]>>>((groups, item) => {
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
  const attentionCandidates = useMemo(
    () =>
      new Map(
        attentionPutAwayProposals.map((proposal) => {
          const sourceTokens = normalisePantryMatchName(proposal.sourceText)
            .split(' ')
            .filter(Boolean)
          const candidates = pantryItems.filter((item) => {
            const pantryTokens = normalisePantryMatchName(item.name).split(' ').filter(Boolean)
            return (
              item.available &&
              pantryTokens.length > 0 &&
              sourceTokens.length > 0 &&
              (pantryTokens.every((token) => sourceTokens.includes(token)) ||
                sourceTokens.every((token) => pantryTokens.includes(token)))
            )
          })
          return [proposal.idempotencyKey, candidates]
        }),
      ),
    [attentionPutAwayProposals, pantryItems],
  )
  const resolvedAttentionProposals = attentionPutAwayProposals
    .map((proposal) => resolveAttentionProposal(proposal))
    .filter((proposal): proposal is Exclude<PantryReconciliationProposal, { kind: 'skip' }> =>
      Boolean(proposal),
    )
  const resolvedNewCount = resolvedAttentionProposals.filter(
    (proposal) => proposal.kind === 'create',
  ).length
  const resolvedUpdatedCount = resolvedAttentionProposals.filter(
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
          item.id !== currentId &&
          item.manual !== false &&
          !item.combineWithPlan &&
          item.name.toLocaleLowerCase() === parsedName.toLocaleLowerCase(),
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
    const purchase = purchases.find((row) => row.id === item.id)
    if (
      purchase &&
      (purchase.members.length > 1 ||
        purchase.members[0]!.name !== purchase.name ||
        purchase.members[0]!.unit !== purchase.unit)
    ) {
      const amounts = new Map<string, { quantity: number | null; unit: string | null }>()
      for (const amount of purchase.amounts.filter((amount) => !amount.asNeeded)) {
        const key = amount.unit ?? ''
        const previous = amounts.get(key)
        amounts.set(key, {
          unit: amount.unit,
          quantity:
            previous?.quantity === null || amount.quantity === null
              ? null
              : (previous?.quantity ?? 0) + amount.quantity,
        })
      }
      setPurchaseEdit({
        purchase,
        combineWithPlan: purchase.members[0]?.combineWithPlan,
        name: purchase.name,
        amounts: [...amounts.values()].map((amount) => ({
          ...amount,
          quantity:
            amount.quantity === null
              ? null
              : purchaseDisplayQuantity(
                  amount.quantity,
                  purchase.amounts.some(
                    (source) => source.unit === amount.unit && source.approximate,
                  ),
                ),
        })),
      })
      setEditErrors({})
      return
    }
    setEditing(item)
    setEditDraft({
      name: item.name,
      measurementSystem: item.measurementSystem,
      combineWithPlan: item.combineWithPlan,
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
    const purchase = purchases.find((row) => row.id === item.id)
    const ids = purchase?.members.map((member) => member.id) ?? [item.id]
    const previous = items
    setSaving(true)
    setItems((current) =>
      current.map((row) => (ids.includes(row.id) ? { ...row, completed: !item.completed } : row)),
    )
    try {
      if (householdId && repository.setCompletedMany) {
        await repository.setCompletedMany(householdId, ids, !item.completed)
        setItems(await repository.list(householdId))
      } else {
        const saved = await Promise.all(
          ids.map((id) => repository.setCompleted(id, !item.completed)),
        )
        setItems((current) =>
          current.map((row) => saved.find((updated) => updated.id === row.id) ?? row),
        )
      }
    } catch (updateError) {
      setItems(previous)
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Cooksmith could not update that item.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function savePurchaseEdit(event: FormEvent) {
    event.preventDefault()
    if (!purchaseEdit || !householdId || !repository.updatePurchase) return
    const name = purchaseEdit.name.trim()
    if (
      !name ||
      name.length > 100 ||
      purchaseEdit.amounts.some(
        (amount) =>
          amount.quantity !== null && (!Number.isFinite(amount.quantity) || amount.quantity < 0),
      )
    ) {
      setEditErrors({ form: 'Check the item name and quantities.' })
      return
    }
    const members = purchaseEdit.purchase.members.filter(
      (item) => purchaseEdit.purchase.completed || !item.completed,
    )
    const assigned = new Set<string>()
    const inputs = members.map((member) => {
      const unit = purchaseAmount(member).unit
      const amount = purchaseEdit.amounts.find((candidate) => candidate.unit === unit)
      const key = unit ?? ''
      const quantity = assigned.has(key) ? 0 : (amount?.quantity ?? null)
      assigned.add(key)
      return {
        id: member.id,
        name,
        quantity,
        unit,
        category: member.category,
        ...(purchaseEdit.purchase.members.length === 1 && member.manual !== false
          ? { combineWithPlan: purchaseEdit.combineWithPlan ?? false }
          : {}),
      }
    })
    setSaving(true)
    try {
      await repository.updatePurchase(householdId, inputs)
      setItems(await repository.list(householdId))
      setPurchaseEdit(null)
    } catch (saveError) {
      setEditErrors({
        form:
          saveError instanceof Error ? saveError.message : 'Cooksmith could not save this item.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function applyPutAwayProposal(proposal: PantryReconciliationProposal) {
    if (!householdId || proposal.kind === 'skip') return false
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
      return true
    } catch (putAwayError) {
      setError(
        putAwayError instanceof Error
          ? putAwayError.message
          : 'Cooksmith could not update Pantry from that shopping item.',
      )
    } finally {
      setReconcilingKey(null)
    }
    return false
  }

  async function updatePantryFromShopping() {
    const proposals = [...actionablePutAwayProposals, ...resolvedAttentionProposals]
    if (proposals.length === 0) return
    const restockedShoppingIds = new Set<string>()
    for (const proposal of proposals) {
      const updated = await applyPutAwayProposal(proposal)
      if (updated) restockedShoppingIds.add(proposal.sourceId)
    }
    if (restockedShoppingIds.size === 0) return
    try {
      await Promise.all(Array.from(restockedShoppingIds, (itemId) => repository.remove(itemId)))
      setItems((current) => current.filter((item) => !restockedShoppingIds.has(item.id)))
      setPantryReviewOpen(false)
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith updated Pantry, but could not clear every shopping item.',
      )
    }
  }

  function resolveAttentionProposal(
    proposal: Extract<PantryReconciliationProposal, { kind: 'skip' }>,
  ): Exclude<PantryReconciliationProposal, { kind: 'skip' }> | null {
    const source = completed.find((item) => item.id === proposal.sourceId)
    if (!source) return null
    const choice = attentionResolutions[proposal.idempotencyKey] ?? 'separate'
    if (choice === 'separate') {
      const classification = classifyPantryItem(source.name)
      return {
        kind: 'create',
        source: 'shopping-put-away',
        sourceId: source.id,
        sourceText: source.name,
        input: {
          name: source.name.trim(),
          category: classification.category,
          categorySource: 'automatic',
          storageLocation: classification.storageLocation,
          storageLocationSource: 'automatic',
          classificationVersion: classification.version,
          quantity: numericQuantity(source.quantity),
          unit: source.unit?.trim() || null,
          available: true,
        },
        idempotencyKey: proposal.idempotencyKey,
      }
    }
    const pantryItem = pantryItems.find((item) => item.id === choice)
    if (!pantryItem) return null
    const unit = source.unit?.trim() || null
    if (!quantitiesAreCompatible(unit, pantryItem.unit)) return null
    return {
      kind: 'increment',
      source: 'shopping-put-away',
      sourceId: source.id,
      sourceText: source.name,
      pantryItemId: pantryItem.id,
      pantryItemName: pantryItem.name,
      quantity: numericQuantity(source.quantity),
      unit,
      idempotencyKey: proposal.idempotencyKey,
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
    setSaving(true)
    try {
      const ids = purchases
        .find((row) => row.id === item.id)
        ?.members.map((member) => member.id) ?? [item.id]
      if (householdId && repository.removeMany) await repository.removeMany(householdId, ids)
      else await Promise.all(ids.map((id) => repository.remove(id)))
      setItems((current) => current.filter((candidate) => !ids.includes(candidate.id)))
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Cooksmith could not remove that item.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading your shopping list" />

  return (
    <div className="page-stack shopping-page">
      <DocumentTitle title="Shopping" />
      <header className="page-header shopping-header">
        <p className="eyebrow">
          Shopping · {purchases.length} {purchases.length === 1 ? 'item' : 'items'}
        </p>
        <div className="shopping-title-row">
          <h1>Your list</h1>
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

      {purchaseEdit ? (
        <Dialog
          open
          title={`Edit ${purchaseEdit.purchase.name}`}
          onOpenChange={(open) => {
            if (!open && !saving) setPurchaseEdit(null)
          }}
        >
          <form onSubmit={(event) => void savePurchaseEdit(event)}>
            <TextField
              id="purchase-edit-name"
              label="Item name"
              value={purchaseEdit.name}
              onChange={(event) => setPurchaseEdit({ ...purchaseEdit, name: event.target.value })}
            />
            {purchaseEdit.purchase.members.length === 1 &&
            purchaseEdit.purchase.manual !== false ? (
              <label className="shopping-combine-choice">
                <input
                  type="checkbox"
                  checked={purchaseEdit.combineWithPlan ?? false}
                  onChange={(event) =>
                    setPurchaseEdit({ ...purchaseEdit, combineWithPlan: event.target.checked })
                  }
                />{' '}
                Include in this product’s planned total
              </label>
            ) : null}
            {purchaseEdit.amounts.map((amount, index) => (
              <TextField
                key={`${amount.unit}-${index}`}
                id={`purchase-amount-${index}`}
                label={amount.unit ? `Quantity (${amount.unit})` : 'Quantity'}
                inputMode="decimal"
                value={amount.quantity === null ? '' : String(amount.quantity)}
                onChange={(event) =>
                  setPurchaseEdit({
                    ...purchaseEdit,
                    amounts: purchaseEdit.amounts.map((candidate, position) =>
                      position === index
                        ? {
                            ...candidate,
                            quantity:
                              event.target.value.trim() === '' ? null : Number(event.target.value),
                          }
                        : candidate,
                    ),
                  })
                }
              />
            ))}
            {editErrors.form ? (
              <p className="form-error" role="alert">
                {editErrors.form}
              </p>
            ) : null}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPurchaseEdit(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {pantryReviewOpen ? (
        <Dialog
          open
          title="Update Pantry from shopping"
          description="Cooksmith will only change Pantry after you confirm these completed shopping items."
          onOpenChange={(open) => setPantryReviewOpen(open)}
        >
          <div className="pantry-update-dialog">
            <div className="pantry-update-columns" aria-label="Pantry update summary">
              <section>
                <h3>Updated</h3>
                <ul className="reconciliation-list">
                  {actionablePutAwayProposals
                    .filter((proposal) => proposal.kind === 'increment')
                    .map((proposal) => (
                      <li key={proposal.idempotencyKey} className="reconciliation-item compact">
                        <span>{proposal.sourceText}</span>
                      </li>
                    ))}
                  {resolvedAttentionProposals
                    .filter((proposal) => proposal.kind === 'increment')
                    .map((proposal) => (
                      <li key={proposal.idempotencyKey} className="reconciliation-item compact">
                        <span>{proposal.sourceText}</span>
                      </li>
                    ))}
                  {updatePutAwayCount + resolvedUpdatedCount === 0 ? <li>None</li> : null}
                </ul>
              </section>
              <section>
                <h3>New</h3>
                <ul className="reconciliation-list">
                  {actionablePutAwayProposals
                    .filter((proposal) => proposal.kind === 'create')
                    .map((proposal) => (
                      <li key={proposal.idempotencyKey} className="reconciliation-item compact">
                        <span>{proposal.sourceText}</span>
                      </li>
                    ))}
                  {resolvedAttentionProposals
                    .filter((proposal) => proposal.kind === 'create')
                    .map((proposal) => (
                      <li key={proposal.idempotencyKey} className="reconciliation-item compact">
                        <span>{proposal.sourceText}</span>
                      </li>
                    ))}
                  {createPutAwayCount + resolvedNewCount === 0 ? <li>None</li> : null}
                </ul>
              </section>
            </div>

            {attentionPutAwayProposals.length > 0 ? (
              <section>
                <h3>Needs attention</h3>
                <p className="form-hint">
                  Cooksmith has suggested whether to match each item or keep it separate.
                </p>
                <ul className="reconciliation-list">
                  {attentionPutAwayProposals.map((proposal) => {
                    const candidates = attentionCandidates.get(proposal.idempotencyKey) ?? []
                    return (
                      <li key={proposal.idempotencyKey} className="reconciliation-attention-item">
                        <span>{proposal.sourceText}</span>
                        <label>
                          <span className="visually-hidden">
                            How should Pantry handle {proposal.sourceText}?
                          </span>
                          <select
                            value={attentionResolutions[proposal.idempotencyKey] ?? 'separate'}
                            onChange={(event) =>
                              setAttentionResolutions((current) => ({
                                ...current,
                                [proposal.idempotencyKey]: event.target.value,
                              }))
                            }
                          >
                            <option value="separate">Keep separate as new</option>
                            {candidates.map((candidate) => {
                              const source = completed.find((item) => item.id === proposal.sourceId)
                              const compatible = quantitiesAreCompatible(
                                source?.unit?.trim() || null,
                                candidate.unit,
                              )
                              return (
                                <option
                                  key={candidate.id}
                                  value={candidate.id}
                                  disabled={!compatible}
                                >
                                  Match {candidate.name}
                                  {!compatible ? ' (unit needs manual edit)' : ''}
                                </option>
                              )
                            })}
                          </select>
                        </label>
                      </li>
                    )
                  })}
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
                disabled={
                  actionablePutAwayProposals.length + resolvedAttentionProposals.length === 0
                }
                onClick={() => void updatePantryFromShopping()}
              >
                Update the pantry
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      {completedPurchases.length > 0 ? (
        <section
          className="shopping-category shopping-completed"
          aria-labelledby="shopping-completed"
        >
          <h2 id="shopping-completed">Done</h2>
          <ul className="shopping-list">
            {completedPurchases.map((item) => (
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
    </div>
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
  item: ShoppingPurchase
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
  const amount = item.amountLabel === 'amount to check' ? null : item.amountLabel
  return (
    <li
      className={`shopping-item${item.completed ? ' shopping-item-completed' : ''}${pantryMatch ? ' shopping-item-pantry-match' : ''}`}
      data-pantry-match-info={item.id}
    >
      <button
        aria-label={`${item.completed ? 'Mark as needed' : 'Mark as done'}: ${item.name}`}
        className="shopping-check"
        disabled={saving}
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
          <label className="visually-hidden" htmlFor={`shopping-unit-${item.id}`}>
            Unit
          </label>
          <input
            id={`shopping-unit-${item.id}`}
            aria-label="Unit"
            placeholder="Unit"
            value={editDraft.unit ?? ''}
            onChange={(event) =>
              onEditDraftChange({ ...editDraft, unit: event.target.value || null })
            }
          />
          {[
            'tsp',
            'teaspoon',
            'teaspoons',
            'tbsp',
            'tablespoon',
            'tablespoons',
            'cup',
            'cups',
          ].includes(editDraft.unit?.toLowerCase() ?? '') ? (
            <MeasurementSelect
              value={editDraft.measurementSystem}
              onChange={(measurementSystem) =>
                onEditDraftChange({ ...editDraft, measurementSystem })
              }
            />
          ) : null}
          {item.manual !== false ? (
            <label className="shopping-combine-choice">
              <input
                type="checkbox"
                checked={editDraft.combineWithPlan ?? false}
                onChange={(event) =>
                  onEditDraftChange({ ...editDraft, combineWithPlan: event.target.checked })
                }
              />{' '}
              Include in this product’s planned total
            </label>
          ) : null}
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
            <div className="shopping-pantry-info" aria-hidden={pantryMatch ? undefined : true}>
              {pantryMatch ? (
                <>
                  <button
                    aria-describedby={
                      pantryInfoOpen ? `pantry-match-message-${item.id}` : undefined
                    }
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
          </div>
          <button
            aria-label={`Edit ${item.name}`}
            disabled={saving}
            className="shopping-icon-action"
            type="button"
            onClick={() => onEdit(item)}
          >
            <Pencil aria-hidden="true" />
          </button>
          <button
            aria-label={`Remove ${item.name}`}
            disabled={saving}
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
