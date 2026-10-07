import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('prepared freezer lifecycle works at 320px with explicit consumption and undo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 })
  page.on('dialog', (dialog) => void dialog.accept())
  await page.goto('/tests/e2e/fixtures/freezer.html')
  await page.getByRole('button', { name: 'Add freezer meal', exact: true }).click()
  await page.getByRole('textbox', { name: 'Meal name' }).fill('Freezer curry')
  await page.getByRole('spinbutton', { name: 'Portions in freezer' }).fill('2')
  await page.getByRole('button', { name: 'Save freezer meal' }).click()
  await expect(page.getByText('2 available · 0 reserved · 2 in freezer')).toBeVisible()
  await page.getByRole('link', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Add dinner', exact: true }).first().click()
  const search = page.getByRole('combobox', { name: 'Dinner' })
  await search.fill('curry')
  await expect(page.getByRole('option', { name: /Freezer curry.*Freezer/ })).toBeVisible()
  await search.press('Enter')
  await expect(
    page.getByText('Prepared freezer meal. No ingredients will be added to Shopping.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save dinner' }).click()
  await expect(page.getByText('Freezer · 1 portions reserved')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Mark used Freezer curry' }).click()
  await page.getByRole('button', { name: 'Undo use Freezer curry' }).click()
  await page.getByRole('button', { name: 'Remove Freezer curry', exact: true }).click()
  await page.getByRole('link', { name: 'Pantry', exact: true }).click()
  await expect(page.getByText('2 available · 0 reserved · 2 in freezer')).toBeVisible()
  await page.getByRole('button', { name: 'Archive freezer meal Freezer curry' }).click()
  await page.getByRole('button', { name: 'Show archived meals' }).click()
  await page.getByRole('button', { name: 'Restore freezer meal Freezer curry' }).click()
  await page.getByRole('button', { name: 'Show active meals' }).click()
  await expect(page.getByText('2 available · 0 reserved · 2 in freezer')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
