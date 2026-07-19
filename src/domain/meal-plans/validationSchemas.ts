import { z } from 'zod'
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner'])
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')
export const plannedMealInputSchema = z
  .object({
    mealDate: isoDateSchema,
    mealType: mealTypeSchema,
    title: z.string().trim().min(1, 'Enter a meal title.').max(120, 'Use 120 characters or fewer.'),
    notes: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().max(500, 'Use 500 characters or fewer.').nullable(),
    ),
    recipeId: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.uuid('Choose a valid recipe.').nullable().default(null),
    ),
    recipeSource: z.enum(['household', 'imported']).nullable().default(null),
  })
  .refine((input) => (input.recipeId === null) === (input.recipeSource === null), {
    message: 'Choose a valid recipe.',
    path: ['recipeId'],
  })
