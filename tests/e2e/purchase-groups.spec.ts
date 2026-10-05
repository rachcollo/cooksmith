import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('synthetic authenticated shopping purchases remain concise and usable', async ({
  page,
}, testInfo) => {
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await expect(page.getByText('70 ml + 3 tbsp', { exact: true })).toBeVisible()
  await expect(page.getByText('50 g + to taste', { exact: true })).toBeVisible()
  await expect(page.getByText('about 200 g', { exact: true })).toBeVisible()
  await expect(page.getByText('fine sea salt', { exact: true })).toBeVisible()
  await expect(page.getByText('extra virgin olive oil', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Recipe amounts')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('shopping-purchases.png'), fullPage: true })
  await page.getByRole('button', { name: 'Edit extra virgin olive oil', exact: true }).click()
  await page.getByLabel('Quantity (ml)').fill('80')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('80 ml + 3 tbsp', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Mark as done: extra virgin olive oil', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Mark as needed: extra virgin olive oil', exact: true }),
  ).toBeVisible()
})

test('combined purchases fit a 320px phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await expect(page.getByText('70 ml + 3 tbsp', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('shopping-320.png'), fullPage: true })
})

test('manual cup settings produce a single approximate weight', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await page.getByRole('button', { name: 'Edit caster sugar', exact: true }).click()
  await page.getByLabel('Cup and spoon measures').selectOption('au')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Save changes to caster sugar', exact: true }).click()
  await expect(page.getByText('about 220 g', { exact: true })).toBeVisible()
})

test('a combined purchase can confirm unresolved spoon sizes on a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await page.getByRole('button', { name: 'Edit extra virgin olive oil', exact: true }).click()
  await page.getByLabel('Cup and spoon measures').selectOption('au')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('130 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('70 ml + 3 tbsp', { exact: true })).toHaveCount(0)
})
