import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ShoppingRepository } from '../../src/application/shopping/shoppingRepository'
import type { PantryRepository } from '../../src/application/pantry/pantryRepository'
import type { ShoppingItem } from '../../src/domain/shopping/types'
import {
  authenticatedTestAuthState,
  authenticatedTestClient,
  completedOnboardingRepository,
  defaultPantryRepository,
  defaultPlannedMealRepository,
  defaultRecipeRepository,
  ownerHouseholdPeopleRepository,
  renderApp,
} from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function item(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'shopping-milk',
    householdId,
    name: 'Milk',
    quantity: 2,
    unit: 'L',
    category: 'dairy_and_eggs',
    completed: false,
    position: 0,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderShopping(
  repository: ShoppingRepository,
  pantryRepository: PantryRepository = defaultPantryRepository,
) {
  return renderApp(
    '/shopping',
    undefined,
    authenticatedTestClient,
    completedOnboardingRepository,
    ownerHouseholdPeopleRepository,
    pantryRepository,
    defaultPlannedMealRepository,
    authenticatedTestAuthState,
    defaultRecipeRepository,
    repository,
  )
}

describe('shopping list foundation', () => {
  it('names exact and related Pantry candidates and supports repeated keyboard dismissal', async () => {
    const repository: ShoppingRepository = {
      list: async () => [item(), item({ id: 'shopping-rice', name: 'Rice' })],
      create: async () => item(),
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const pantryRepository: PantryRepository = {
      list: async (nextHouseholdId) => [
        {
          id: 'pantry-milk',
          householdId: nextHouseholdId,
          name: ' milk ',
          category: 'dairy',
          categorySource: 'explicit',
          storageLocation: 'fridge',
          storageLocationSource: 'explicit',
          classificationVersion: null,
          quantity: 1,
          unit: 'L',
          available: true,
          isDefault: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'pantry-rice-vinegar',
          householdId: nextHouseholdId,
          name: 'Rice vinegar',
          category: 'oils_and_vinegars',
          categorySource: 'explicit',
          storageLocation: 'pantry',
          storageLocationSource: 'explicit',
          classificationVersion: null,
          quantity: null,
          unit: null,
          available: true,
          isDefault: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      create: async () => defaultPantryRepository.create(householdId, {} as never),
      update: async () => defaultPantryRepository.update('', {} as never),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository, pantryRepository)

    const info = await screen.findByRole('button', {
      name: 'Why should I check my pantry for Milk?',
    })
    expect(screen.getByText('Shopping · 2 items')).toHaveClass('eyebrow')
    expect(screen.getByRole('heading', { name: 'Dairy and eggs' })).toBeVisible()
    expect(info.closest('li')).toHaveClass('shopping-item-pantry-match')
    expect(screen.queryByText('May already have')).not.toBeInTheDocument()
    const relatedInfo = screen.getByRole('button', {
      name: 'Why should I check my pantry for Rice?',
    })
    expect(relatedInfo).toBeVisible()
    const milkRow = screen.getByText('Milk').closest('li')
    const riceRow = screen.getByText('Rice').closest('li')
    expect(within(milkRow!).getByRole('button', { name: 'Edit Milk' })).toBeVisible()
    expect(within(riceRow!).getByRole('button', { name: 'Edit Rice' })).toBeVisible()

    await user.click(info)
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Check Pantry: milk. Check the form and amount before buying.',
    )
    expect(info).toHaveAttribute('aria-describedby', 'pantry-match-message-shopping-milk')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.click(relatedInfo)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Check Pantry: Rice vinegar.')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.click(relatedInfo)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Rice vinegar')
    await user.tab()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
  it('reviews completed shopping through the atomic boundary and keeps bought history', async () => {
    const putAway = vi.fn(async () => ({
      appliedSources: 1,
      alreadyAppliedSources: 0,
      pantryItems: 1,
    }))
    const remove = vi.fn(async () => undefined)
    const repository: ShoppingRepository = {
      list: async () => [item({ completed: true })],
      create: async () => item(),
      update: async () => item(),
      setCompleted: async () => item(),
      remove,
      listPutAway: async () => [
        {
          key: 'm:shopping-milk',
          token: 'snapshot',
          shoppingItemId: 'shopping-milk',
          name: 'Milk',
        },
      ],
      putAway,
    }
    const user = userEvent.setup()
    renderShopping(repository)
    await user.click(await screen.findByRole('button', { name: 'Put shopping away' }))
    const dialog = screen.getByRole('dialog', { name: 'Put shopping away' })
    await user.click(within(dialog).getByRole('button', { name: /^Put away \d+ items?$/ }))
    await screen.findByText('1 Pantry item is now available.')
    expect(putAway).toHaveBeenCalledWith(householdId, expect.any(String), [
      {
        name: 'milk',
        quantity: null,
        unit: null,
        pantryUpdatedAt: null,
        sources: [{ key: 'm:shopping-milk', token: 'snapshot' }],
        category: 'dairy',
        storageLocation: 'fridge',
      },
    ])
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeVisible()
  })

  it('quickly adds a household item with safe defaults for hidden fields', async () => {
    const create = vi.fn(async (nextHouseholdId, input) => ({
      id: 'shopping-apples',
      householdId: nextHouseholdId,
      ...input,
      completed: false,
      position: 1,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies ShoppingRepository['create']
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create,
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Your list' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Add an item' }).closest('.shopping-add-panel'),
    ).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('1 item left to buy')
    expect(screen.queryByLabelText('Unit')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Item name'), 'Apples')
    await user.type(screen.getByLabelText(/^Quantity/), '6')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Apples',
      quantity: 6,
      unit: null,
      category: 'other',
    })
    expect(await screen.findByText('Apples')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Other' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('2 items left to buy')
  })

  it('submits quick add from the keyboard through the same mutation', async () => {
    const create = vi.fn(async (nextHouseholdId, input) => ({
      id: 'shopping-bread',
      householdId: nextHouseholdId,
      ...input,
      completed: false,
      position: 0,
      updatedAt: '2026-01-01T00:00:00Z',
    })) satisfies ShoppingRepository['create']
    const repository: ShoppingRepository = {
      list: async () => [],
      create,
      update: async () => item(),
      setCompleted: async () => item(),
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    const name = await screen.findByLabelText('Item name')
    await user.type(name, 'Bread{Enter}')

    expect(create).toHaveBeenCalledWith(householdId, {
      name: 'Bread',
      quantity: null,
      unit: null,
      category: 'other',
    })
    expect(await screen.findByText('Bread')).toBeVisible()
  })

  it('persists completion and lets a household member restore an item', async () => {
    const setCompleted = vi.fn(async (itemId, completed) => item({ id: itemId, completed }))
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      update: async () => item(),
      setCompleted,
      remove: async () => undefined,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    await user.click(await screen.findByRole('button', { name: 'Mark as done: Milk' }))
    expect(setCompleted).toHaveBeenCalledWith('shopping-milk', true)
    expect(screen.getByRole('status')).toHaveTextContent('0 items left to buy')
    expect(await screen.findByRole('heading', { name: 'Done' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Mark as needed: Milk' }))
    expect(setCompleted).toHaveBeenLastCalledWith('shopping-milk', false)
    expect(screen.getByRole('status')).toHaveTextContent('1 item left to buy')
  })

  it('edits and removes an item without exposing destructive actions accidentally', async () => {
    const update = vi.fn(async (itemId, input) => item({ id: itemId, ...input }))
    const remove = vi.fn(async () => undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository: ShoppingRepository = {
      list: async () => [item()],
      create: async () => item(),
      update,
      setCompleted: async () => item(),
      remove,
    }
    const user = userEvent.setup()
    renderShopping(repository)

    const editButton = await screen.findByRole('button', { name: 'Edit Milk' })
    const row = editButton.closest('li')
    expect(row).not.toBeNull()
    await user.click(editButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.clear(within(row!).getByLabelText('Item name'))
    await user.type(within(row!).getByLabelText('Item name'), 'Oat milk')
    await user.clear(within(row!).getByLabelText('Quantity'))
    await user.type(within(row!).getByLabelText('Quantity'), '3')
    await user.click(within(row!).getByRole('button', { name: 'Save changes to Milk' }))
    expect(update).toHaveBeenCalledWith('shopping-milk', {
      name: 'Oat milk',
      quantity: 3,
      unit: 'L',
      category: 'dairy_and_eggs',
    })
    expect(await screen.findByText('Oat milk')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Remove Oat milk' }))
    expect(remove).toHaveBeenCalledWith('shopping-milk')
    expect(await screen.findByRole('heading', { name: 'Your list is ready' })).toBeVisible()
  })
})

describe('Shopping decimal drafts', () => {
  it.each(['type', 'paste'] as const)(
    'keeps %s of 0.004 through save and reopen',
    async (entry) => {
      const user = userEvent.setup()
      let saved = item({ name: 'Saffron', quantity: 1, unit: 'kg' })
      const update = vi.fn(async (_id, input) => (saved = { ...saved, ...input }))
      renderShopping({
        list: async () => [saved],
        create: async () => saved,
        update,
        setCompleted: async () => saved,
        remove: async () => undefined,
      })
      await user.click(await screen.findByRole('button', { name: 'Edit Saffron' }))
      const form = screen.getByRole('button', { name: 'Save changes to Saffron' }).closest('form')!
      const quantity = within(form).getByLabelText('Quantity')
      await user.clear(quantity)
      if (entry === 'type') await user.type(quantity, '0.004')
      else await user.paste('0.004')
      expect(quantity).toHaveValue('0.004')
      await user.click(within(form).getByRole('button', { name: 'Save changes to Saffron' }))
      expect(update).toHaveBeenCalledWith(
        saved.id,
        expect.objectContaining({ quantity: 4, unit: 'g' }),
      )
      await user.click(screen.getByRole('button', { name: 'Edit Saffron' }))
      expect(
        within(
          screen.getByRole('button', { name: 'Save changes to Saffron' }).closest('form')!,
        ).getByLabelText('Quantity'),
      ).toHaveValue('4')
    },
  )
  it('rejects tiny unsupported amounts without losing the draft, then accepts an ordinary edit', async () => {
    const user = userEvent.setup()
    const saved = item({ name: 'Saffron', quantity: 1, unit: 'g' })
    const update = vi.fn(async (_id, input) => ({ ...saved, ...input }))
    renderShopping({
      list: async () => [saved],
      create: async () => saved,
      update,
      setCompleted: async () => saved,
      remove: async () => undefined,
    })
    await user.click(await screen.findByRole('button', { name: 'Edit Saffron' }))
    const form = screen.getByRole('button', { name: 'Save changes to Saffron' }).closest('form')!
    const quantity = within(form).getByLabelText('Quantity')
    await user.clear(quantity)
    await user.type(quantity, '0.004')
    await user.click(within(form).getByRole('button', { name: 'Save changes to Saffron' }))
    expect(update).not.toHaveBeenCalled()
    expect(quantity).toHaveValue('0.004')
    expect(quantity).toHaveAccessibleDescription(/at most two decimal places/)
    await user.clear(quantity)
    await user.type(quantity, '1.5')
    await user.click(within(form).getByRole('button', { name: 'Save changes to Saffron' }))
    expect(update).toHaveBeenCalledWith(
      saved.id,
      expect.objectContaining({ quantity: 1.5, unit: 'g' }),
    )
  })
})

it('preserves an add draft and reports incomplete/tiny counts before accepting ordinary quantity', async () => {
  const user = userEvent.setup()
  const create = vi.fn(async (_householdId, input) => item({ ...input, id: 'created' }))
  renderShopping({
    list: async () => [],
    create,
    update: async () => item(),
    setCompleted: async () => item(),
    remove: async () => undefined,
  })
  await screen.findByLabelText('Item name')
  const name = screen.getByLabelText('Item name')
  const form = name.closest('form')!
  await user.type(name, 'Synthetic rice')
  const quantity = within(form).getByLabelText(/Quantity/)
  await user.type(quantity, '0.')
  await user.click(within(form).getByRole('button', { name: /Add/ }))
  expect(create).not.toHaveBeenCalled()
  expect(quantity).toHaveValue('0.')
  await user.type(quantity, '004')
  await user.click(within(form).getByRole('button', { name: /Add/ }))
  expect(create).not.toHaveBeenCalled()
  expect(quantity).toHaveValue('0.004')
  await user.clear(quantity)
  await user.paste(`0.${'0'.repeat(330)}4`)
  await user.click(within(form).getByRole('button', { name: /Add/ }))
  expect(create).not.toHaveBeenCalled()
  expect(quantity).toHaveAccessibleDescription(/too small/)
  await user.clear(quantity)
  await user.type(quantity, '0.25')
  await user.click(within(form).getByRole('button', { name: /Add/ }))
  expect(create).toHaveBeenCalledWith(
    householdId,
    expect.objectContaining({ quantity: 0.25, unit: null }),
  )
})
