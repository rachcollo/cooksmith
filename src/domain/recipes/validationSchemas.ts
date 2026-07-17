import { z } from 'zod'

const optionalTrimmedText = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max, message).nullable(),
  )

const optionalWholeNumber = (label: string, max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') return null
      if (value === undefined) return null
      return value
    },
    z.coerce
      .number()
      .int(`${label} must be a whole number.`)
      .min(0, `${label} cannot be negative.`)
      .max(max, `Use a smaller ${label.toLocaleLowerCase()}.`)
      .nullable(),
  )

const safeWebUrl = (label: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z
      .string()
      .trim()
      .url(`Enter a valid ${label.toLocaleLowerCase()}.`)
      .refine(
        (value) => ['http:', 'https:'].includes(new URL(value).protocol),
        `${label} must start with http:// or https://.`,
      )
      .nullable(),
  )

export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a recipe name.').max(120, 'Use 120 characters or fewer.'),
  ingredients: optionalTrimmedText(4000, 'Use 4000 characters or fewer.'),
  description: optionalTrimmedText(5000, 'Use 5000 characters or fewer.'),
  sourceNote: optionalTrimmedText(240, 'Use 240 characters or fewer.'),
  sourceUrl: safeWebUrl('Source URL'),
  servings: optionalWholeNumber('Servings', 100),
  prepTimeMinutes: optionalWholeNumber('Preparation time', 1440),
  cookTimeMinutes: optionalWholeNumber('Cooking time', 1440),
  imageUrl: safeWebUrl('Image URL'),
})
