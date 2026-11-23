import { z } from 'zod'
import { isStoredShoppingQuantity, normaliseShoppingQuantity } from './quantityPrecision'

export const shoppingItemInputSchema = z
  .object({
    combineWithPlan: z.boolean().optional(),
    measurementSystem: z.enum(['unknown', 'au', 'metric', 'us']).optional(),
    name: z.string().trim().min(1, 'Enter an item name.').max(100, 'Use 100 characters or fewer.'),
    quantity: z.number().finite().nonnegative('Quantity cannot be negative.').nullable(),
    unit: z
      .string()
      .trim()
      .max(40, 'Use 40 characters or fewer.')
      .transform((value) => value || null)
      .nullable(),
    category: z.enum([
      'produce',
      'meat_and_seafood',
      'dairy_and_eggs',
      'bakery',
      'pantry',
      'frozen',
      'household',
      'other',
    ]),
  })
  .transform((input) => ({ ...input, ...normaliseShoppingQuantity(input.quantity, input.unit) }))
  .superRefine((input, context) => {
    if (input.quantity !== null && !isStoredShoppingQuantity(input.quantity)) {
      context.addIssue({
        code: 'custom',
        path: ['quantity'],
        message:
          'Use an amount with at most two decimal places in this unit, or leave the quantity blank. Small kg or L amounts can use g or ml.',
      })
    }
  })
