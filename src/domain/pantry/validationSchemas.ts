import { z } from 'zod'

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().min(1, 'Enter a unit.').max(40, 'Use 40 characters or fewer.').nullable(),
)

const optionalQuantity = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return null
  if (value === undefined) return null
  return value
}, z.coerce.number().min(0, 'Quantity cannot be negative.').max(99999, 'Use a smaller quantity.').nullable())

export const pantryItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter an item name.').max(100, 'Use 100 characters or fewer.'),
  category: z.enum([
    'baking',
    'breakfast',
    'canned_and_jarred',
    'condiments_and_sauces',
    'grains_rice_and_pasta',
    'herbs_and_spices',
    'oils_and_vinegars',
    'snacks',
    'tea_coffee_and_drinks',
    'other',
  ]),
  quantity: optionalQuantity,
  unit: optionalTrimmedString,
  available: z.boolean(),
})
