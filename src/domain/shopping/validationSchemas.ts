import { z } from 'zod'

export const shoppingItemInputSchema = z.object({
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
