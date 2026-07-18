import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RecipeRepository } from '../../src/application/recipes/recipeRepository'
import type { Recipe, RecipeIngredientInput, RecipeStepInput } from '../../src/domain/recipes/types'
import { renderApp } from '../renderApp'

const householdId = '20000000-0000-4000-8000-000000000001'

function recipe(overrides: Partial<Recipe>): Recipe {
  return {
    id: 'recipe-1',
    householdId,
    name: 'Lentil soup',
    ingredients: '1 cup lentils',
    description: 'Simmer until tender.',
    sourceNote: null,
    sourceUrl: null,
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    imageUrl: null,
    notes: null,
    category: null,
    tags: [],
    favourite: false,
    ingredientRows: [],
    steps: [],
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('recipe library experience', () => {
  it('loads an empty library and creates a recipe that opens in detail', async () => {
    const create = vi.fn(async (householdId, input) =>
      recipe({
        id: 'created',
        householdId,
        ...input,
        ingredientRows: input.ingredientRows.map((row: RecipeIngredientInput, index: number) => ({
          id: `ingredient-${index + 1}`,
          originalLineText: row.name,
          parserVersion: 'recipe-content-v1',
          derivationStatus: 'derived',
          position: index + 1,
          ...row,
        })),
        steps: input.steps.map((step: RecipeStepInput, index: number) => ({
          id: `step-${index + 1}`,
          originalLineText: step.instruction,
          parserVersion: 'recipe-content-v1',
          derivationStatus: 'derived',
          position: index + 1,
          ...step,
        })),
      }),
    ) satisfies RecipeRepository['create']
    const repository: RecipeRepository = {
      list: async () => [],
      create,
      update: async () => recipe({}),
      archive: async () => recipe({}),
    }

    renderApp(
      '/recipes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    expect(await screen.findByRole('heading', { name: 'Start your recipe library' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }))
    const createDialog = screen.getByRole('dialog', { name: 'Add a recipe' })
    await userEvent.type(within(createDialog).getByLabelText('Recipe name'), 'Pumpkin pasta')
    await userEvent.type(
      within(createDialog).getByLabelText(/Ingredients/),
      'Pumpkin, pasta and feta',
    )
    await userEvent.type(within(createDialog).getByLabelText(/Instructions/), 'Fast pantry dinner')
    await userEvent.type(within(createDialog).getByLabelText(/Servings/), '4')
    await userEvent.type(within(createDialog).getByLabelText(/Preparation time in minutes/), '15')
    await userEvent.type(within(createDialog).getByLabelText(/Cooking time in minutes/), '20')
    await userEvent.click(within(createDialog).getByRole('button', { name: 'Save recipe' }))

    expect(create).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({
        name: 'Pumpkin pasta',
        ingredients: 'Pumpkin, pasta and feta',
        description: 'Fast pantry dinner',
        servings: 4,
      }),
    )
    const createdDialog = await screen.findByRole('dialog', { name: 'Pumpkin pasta' })
    expect(within(createdDialog).getByText('Fast pantry dinner')).toBeVisible()
  })

  it('searches, clears no-result state, edits, cancels and archives recipes', async () => {
    const update = vi.fn(async (_householdId, id, input) =>
      recipe({
        id,
        ...input,
        ingredientRows: input.ingredientRows.map((row: RecipeIngredientInput, index: number) => ({
          id: `ingredient-${index + 1}`,
          originalLineText: row.name,
          parserVersion: 'recipe-content-v1',
          derivationStatus: 'derived',
          position: index + 1,
          ...row,
        })),
        steps: input.steps.map((step: RecipeStepInput, index: number) => ({
          id: `step-${index + 1}`,
          originalLineText: step.instruction,
          parserVersion: 'recipe-content-v1',
          derivationStatus: 'derived',
          position: index + 1,
          ...step,
        })),
      }),
    ) satisfies RecipeRepository['update']
    const archive = vi.fn(async (_householdId, id) =>
      recipe({ id, archivedAt: '2026-01-02T00:00:00Z' }),
    ) satisfies RecipeRepository['archive']
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository: RecipeRepository = {
      list: async () => [
        recipe({}),
        recipe({ id: 'recipe-2', name: 'Apple crumble', description: null }),
      ],
      create: async () => recipe({ id: 'new' }),
      update,
      archive,
    }
    const user = userEvent.setup()

    renderApp(
      '/recipes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    expect(await screen.findByRole('button', { name: 'Open Lentil soup recipe' })).toBeVisible()
    await user.type(screen.getByLabelText('Search recipes'), 'xyz')
    expect(screen.getByRole('heading', { name: 'No matching recipes' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('button', { name: 'Open Apple crumble recipe' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open Apple crumble recipe' }))
    const detailDialog = screen.getByRole('dialog', { name: 'Apple crumble' })
    expect(within(detailDialog).getByText('No instructions added yet.')).toBeVisible()
    await user.click(within(detailDialog).getByRole('button', { name: 'Edit recipe' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Apple crumble' })
    await user.clear(within(dialog).getByLabelText('Recipe name'))
    await user.type(within(dialog).getByLabelText('Recipe name'), 'Apple crumble tray')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Apple crumble tray')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit recipe' }))
    const secondDialog = screen.getByRole('dialog', {
      name: 'Edit Apple crumble',
    })
    await user.clear(within(secondDialog).getByLabelText('Recipe name'))
    await user.type(within(secondDialog).getByLabelText('Recipe name'), 'Apple crumble tray')
    await user.click(within(secondDialog).getByRole('button', { name: 'Save changes' }))
    expect(update).toHaveBeenCalledWith(
      householdId,
      'recipe-2',
      expect.objectContaining({ name: 'Apple crumble tray' }),
    )
    expect((await screen.findAllByRole('heading', { name: 'Apple crumble tray' }))[0]).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Archive recipe' }))
    expect(archive).toHaveBeenCalledWith(householdId, 'recipe-2')
    expect(screen.queryByRole('heading', { name: 'Apple crumble tray' })).not.toBeInTheDocument()
  })

  it('shows validation and repository failures, then refreshes for household changes', async () => {
    const list = vi.fn(async () => [recipe({})]) satisfies RecipeRepository['list']
    const repository: RecipeRepository = {
      list,
      create: async () => {
        throw new Error('Friendly save failure.')
      },
      update: async () => recipe({}),
      archive: async () => recipe({}),
    }

    renderApp(
      '/recipes',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    await screen.findByRole('button', { name: 'Open Lentil soup recipe' })
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }))
    const createDialog = screen.getByRole('dialog', { name: 'Add a recipe' })
    await userEvent.type(within(createDialog).getByLabelText('Recipe name'), 'Broken')
    await userEvent.type(
      within(createDialog).getByLabelText(/Source or website/),
      'ftp://example.invalid/recipe',
    )
    await userEvent.click(within(createDialog).getByRole('button', { name: 'Save recipe' }))
    expect(await screen.findByText('Source URL must start with http:// or https://.')).toBeVisible()

    await userEvent.clear(within(createDialog).getByLabelText(/Source or website/))
    await userEvent.click(within(createDialog).getByRole('button', { name: 'Save recipe' }))
    expect(await screen.findByText('Friendly save failure.')).toBeVisible()
    expect(list).toHaveBeenCalledWith(householdId)
  })
})
