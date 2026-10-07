import { expect, it } from 'vitest'
import { freezerMealInputSchema } from '../../src/domain/freezer/validation'
import { buildPlanAdditions } from '../../src/domain/shopping/planGeneration'
import { proposeWeekMeals } from '../../src/domain/meal-plans/weekGeneration'
import { defaultPlannedMealRepository, defaultRecipeRepository } from '../renderApp'
it('validates whole stock, date order and one optional recipe source', () => {
  const input = {
    name: 'Curry',
    portions: 2,
    frozenOn: '2026-10-06',
    useFirstOn: null,
    notes: null,
    householdRecipeId: null,
    importedRecipeId: null,
  }
  expect(freezerMealInputSchema.safeParse(input).success).toBe(true)
  for (const patch of [
    { portions: -1 },
    { portions: 1.5 },
    { frozenOn: '2026-02-30' },
    { useFirstOn: '2026-10-05' },
    { name: '' },
    {
      householdRecipeId: '30000000-0000-4000-8000-000000000001',
      importedRecipeId: '30000000-0000-4000-8000-000000000002',
    },
  ])
    expect(freezerMealInputSchema.safeParse({ ...input, ...patch }).success).toBe(false)
})
it('freezer provenance suppresses shopping even with an optional recipe present', async () => {
  const recipe = (await defaultRecipeRepository.list('h'))[0]!
  expect(
    buildPlanAdditions(
      [
        {
          freezerMealId: 'stock',
          recipeState: { kind: 'active', recipe },
          recipeSource: 'household',
        },
      ],
      [recipe],
      [],
    ).additions,
  ).toEqual([])
})
it('automatic week replacement preserves freezer reservations', async () => {
  const meal = {
    ...(await defaultPlannedMealRepository.create('h', {
      title: 'Freezer curry',
      mealDate: '2026-10-05',
      mealType: 'dinner',
      notes: null,
      recipeId: null,
      recipeSource: null,
    })),
    freezerMealId: 'stock',
  }
  const result = proposeWeekMeals({
    meals: [meal],
    recipes: await defaultRecipeRepository.list('h'),
    replace: true,
    weekStart: '2026-10-05',
    random: () => 0,
  })
  expect(result.preservedMeals).toEqual([meal])
  expect(result.replacedMeals).toEqual([])
  expect(result.proposals.some((p) => p.mealDate === meal.mealDate)).toBe(false)
})
