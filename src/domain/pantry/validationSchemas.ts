import { z } from 'zod'

export const pantryItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter an item name.').max(100, 'Use 100 characters or fewer.'),
  category: z.enum([
    'staples',
    'baking',
    'canned_goods',
    'condiments',
    'spices',
    'fresh',
    'frozen',
    'drinks',
    'household',
  ]),
  storageLocation: z.enum(['pantry', 'fridge', 'freezer']),
  quantity: z.coerce
    .number()
    .min(0, 'Quantity cannot be negative.')
    .max(99999, 'Use a smaller quantity.'),
  unit: z.string().trim().min(1, 'Enter a unit.').max(40, 'Use 40 characters or fewer.'),
  available: z.boolean(),
})
