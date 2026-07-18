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
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      if (trimmed === '') return null
      return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
    },
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

const optionalString = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max, message).nullable(),
  )

export const quantitySchema = z
  .string()
  .trim()
  .max(24, 'Use 24 characters or fewer.')
  .refine(
    (value) =>
      value === '' ||
      /^\d+(\.\d+)?$/.test(value) ||
      /^\d+\/\d+$/.test(value) ||
      /^\d+\s+\d+\/\d+$/.test(value),
    'Use a number or fraction such as 1/2 or 1 1/2.',
  )

export const recipeIngredientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter an ingredient name.')
    .max(160, 'Use 160 characters or fewer.'),
  quantity: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    quantitySchema.nullable(),
  ),
  unit: optionalString(40, 'Use 40 characters or fewer.'),
  preparation: optionalString(120, 'Use 120 characters or fewer.'),
})

export const recipeStepInputSchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(1, 'Enter an instruction step.')
    .max(1200, 'Use 1200 characters or fewer.'),
})

export const recipeInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a recipe name.').max(120, 'Use 120 characters or fewer.'),
  ingredients: optionalTrimmedText(4000, 'Use 4000 characters or fewer.'),
  description: optionalTrimmedText(5000, 'Use 5000 characters or fewer.'),
  sourceNote: optionalTrimmedText(240, 'Use 240 characters or fewer.'),
  sourceUrl: safeWebUrl('Source URL'),
  authorName: optionalTrimmedText(160, 'Use 160 characters or fewer.').optional().default(null),
  publisherName: optionalTrimmedText(160, 'Use 160 characters or fewer.').optional().default(null),
  servings: optionalWholeNumber('Servings', 100),
  prepTimeMinutes: optionalWholeNumber('Preparation time', 1440),
  cookTimeMinutes: optionalWholeNumber('Cooking time', 1440),
  imageUrl: safeWebUrl('Image URL'),
  notes: optionalTrimmedText(4000, 'Use 4000 characters or fewer.').default(null),
  category: optionalTrimmedText(80, 'Use 80 characters or fewer.').default(null),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(12, 'Use 12 tags or fewer.')
    .transform((tags) => Array.from(new Set(tags.map((tag) => tag.toLocaleLowerCase()))))
    .default([]),
  favourite: z.boolean().default(false),
  ingredientRows: z
    .array(recipeIngredientInputSchema)
    .max(80, 'Use 80 ingredients or fewer.')
    .default([]),
  steps: z.array(recipeStepInputSchema).max(60, 'Use 60 steps or fewer.').default([]),
})
