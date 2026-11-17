import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('import review saves privately with attribution and no publication control', async ({
  page,
}) => {
  await page.goto('/tests/e2e/fixtures/private-import.html')
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByLabel('Recipe URL').fill('https://example.invalid/noodles')
  await page.getByRole('button', { name: 'Import recipe', exact: true }).click()
  const review = page.getByRole('dialog', { name: 'Review imported recipe' })
  await expect(review.getByText('This import is private. Only you can see it.')).toBeVisible()
  await expect(review.getByRole('radio')).toHaveCount(0)
  await expect(review.getByLabel('Author')).toHaveValue('Synthetic cook')
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([])
  const save = review.getByRole('button', { name: 'Save imported recipe' })
  await save.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Private recipe', { exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic cook', { exact: false })).toBeVisible()
  await expect(page.getByText('Synthetic kitchen', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
