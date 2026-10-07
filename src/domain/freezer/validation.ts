import { z } from 'zod'
const date = z.iso.date('Use a valid calendar date.')
export const freezerMealInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a meal name.').max(120),
    portions: z.number().int('Use whole portions.').min(0).max(9999),
    frozenOn: date,
    useFirstOn: date.nullable(),
    notes: z.string().trim().max(500).nullable(),
    householdRecipeId: z.uuid().nullable(),
    importedRecipeId: z.uuid().nullable(),
  })
  .refine((v) => !v.useFirstOn || v.useFirstOn >= v.frozenOn, {
    message: 'Use-first date cannot be before the frozen date.',
    path: ['useFirstOn'],
  })
  .refine((v) => !v.householdRecipeId || !v.importedRecipeId, {
    message: 'Choose one recipe.',
    path: ['householdRecipeId'],
  })
