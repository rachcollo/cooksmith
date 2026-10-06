import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('planner search and deliberate manual meals work at 320px by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/planner.html')
  await page.getByRole('button', { name: 'Add dinner', exact: true }).first().click()
  const search = page.getByRole('combobox', { name: 'Dinner' })
  await search.fill('lent')
  await expect(page.getByRole('option', { name: /Lentil soup/ })).toBeVisible()
  await search.press('ArrowDown')
  await search.press('ArrowUp')
  await search.press('Enter')
  await expect(
    page.getByText('Recipe selected. Ingredients will be added to Shopping.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save dinner', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lentil soup', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add dinner', exact: true }).first().click()
  await search.fill('Dinner with friends')
  await expect(page.getByText('No matching recipes. Add this as a manual meal.')).toBeVisible()
  const inputBox = (await search.boundingBox())!
  const resultsBox = (await page.getByRole('listbox', { name: 'Dinner choices' }).boundingBox())!
  expect(resultsBox.y - inputBox.y - inputBox.height).toBeGreaterThanOrEqual(0)
  expect(resultsBox.y - inputBox.y - inputBox.height).toBeLessThanOrEqual(8)
  expect(Math.abs(resultsBox.x - inputBox.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultsBox.width - inputBox.width)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Save dinner', exact: true })).toBeDisabled()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await search.press('Enter')
  await page.getByRole('button', { name: 'Save dinner', exact: true }).click()
  await expect(page.getByText('Manual meal', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit planned dinner Dinner with friends' }).click()
  await search.fill('Takeaway')
  await search.press('Enter')
  await page.getByRole('button', { name: 'Save dinner', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Takeaway', exact: true })).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Remove Takeaway', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Takeaway', exact: true })).toHaveCount(0)
})
