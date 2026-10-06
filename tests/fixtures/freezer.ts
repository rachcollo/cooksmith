import { defaultPlannedMealRepository } from '../renderApp'
import type { FreezerRepository } from '../../src/application/freezer/freezerRepository'
import type { FreezerMeal } from '../../src/domain/freezer/types'
import type { PlannedMeal } from '../../src/domain/meal-plans/types'
export function freezerFixture(initial: FreezerMeal[] = []) {
  const stock = initial.map((r) => ({ ...r }))
  let plans: PlannedMeal[] = []
  const receipts = new Set<string>()
  const householdId = '20000000-0000-4000-8000-000000000001'
  const repository: FreezerRepository = {
    list: async () => stock.map((row) => ({ ...row, available: row.portions - row.reserved })),
    command: async (h, command) => {
      if (receipts.has(command.operationId)) return
      const payload = command.payload,
        row = stock.find((r) => r.id === command.freezerId),
        plan = plans.find((p) => p.id === command.planId)
      switch (command.action) {
        case 'create':
          stock.push({
            id: command.freezerId,
            householdId: h,
            name: String(payload.name),
            portions: Number(payload.portions),
            frozenOn: String(payload.frozenOn),
            useFirstOn: payload.useFirstOn as string | null,
            notes: payload.notes as string | null,
            householdRecipeId: payload.householdRecipeId as string | null,
            importedRecipeId: payload.importedRecipeId as string | null,
            reserved: 0,
            available: Number(payload.portions),
            revision: 0,
            archivedAt: null,
          })
          break
        case 'edit':
          Object.assign(row!, payload, { revision: row!.revision + 1 })
          break
        case 'archive':
          row!.archivedAt = '2026-10-06'
          break
        case 'restore':
          row!.archivedAt = null
          break
        case 'reserve':
          if (row!.portions - row!.reserved < Number(payload.portions))
            throw new Error('Not enough stock.')
          row!.reserved += Number(payload.portions)
          plans.push({
            ...(await defaultPlannedMealRepository.create(h, {
              title: row!.name,
              mealDate: String(payload.mealDate),
              mealType: 'dinner',
              notes: payload.notes as string | null,
              recipeId: null,
              recipeSource: null,
            })),
            id: command.planId!,
            freezerMealId: row!.id,
            freezerPortions: Number(payload.portions),
            freezerState: 'reserved',
          })
          break
        case 'consume':
          if (plan!.freezerState === 'reserved') {
            row!.portions -= plan!.freezerPortions!
            row!.reserved -= plan!.freezerPortions!
            plan!.freezerState = 'consumed'
          }
          break
        case 'undo':
          if (plan!.freezerState === 'consumed') {
            row!.portions += plan!.freezerPortions!
            row!.reserved += plan!.freezerPortions!
            plan!.freezerState = 'reserved'
          }
          break
      }
      receipts.add(command.operationId)
    },
  }
  const planner = {
    ...defaultPlannedMealRepository,
    listWeek: async () => plans.map((p) => ({ ...p })),
    update: async (
      id: string,
      input: Parameters<typeof defaultPlannedMealRepository.update>[1],
    ) => {
      const plan = plans.find((p) => p.id === id)!
      Object.assign(plan, input)
      return { ...plan }
    },
    remove: async (id: string) => {
      const plan = plans.find((p) => p.id === id)
      if (plan?.freezerState === 'reserved')
        stock.find((r) => r.id === plan.freezerMealId)!.reserved -= plan.freezerPortions!
      plans = plans.filter((p) => p.id !== id)
    },
  }
  return {
    repository,
    planner,
    householdId,
    get plans() {
      return plans
    },
  }
}
