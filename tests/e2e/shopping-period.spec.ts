import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('shopping range is reversible with manual items and accessible custom dates at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/shopping-period.html?fail')
  const selector = page.getByRole('combobox', { name: 'Buy for' })
  await selector.selectOption('custom')
  const from = page.getByLabel('From date')
  const start = await from.getAttribute('min')
  await page.getByLabel('To date').fill(start!)
  await page.getByRole('button', { name: 'Apply period' }).click()
  await expect(page.getByText(/previous list is still available/)).toBeVisible()
  await page.getByRole('button', { name: 'Apply period' }).press('Enter')
  await expect(page.getByRole('region', { name: 'Shopping period' })).toContainText(
    '1 planned meal included',
  )
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await selector.selectOption('week')
  await page.getByRole('button', { name: 'Apply period' }).click()
  await expect(page.getByRole('region', { name: 'Shopping period' })).toContainText(
    '5 planned meals included',
  )
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
})
