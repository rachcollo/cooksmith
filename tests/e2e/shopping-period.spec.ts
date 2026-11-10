import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('shopping range is reversible with manual items and accessible custom dates at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/shopping-period.html?fail')
  const selector = page.getByRole('combobox', { name: 'Buy for' })
  await expect(page.getByRole('button', { name: /Apply|Save dates/ })).toHaveCount(0)
  const box = (await page.getByRole('region', { name: 'Shopping period' }).boundingBox())!
  expect(box.height).toBeLessThan(180)
  await selector.selectOption('custom')
  const from = page.getByLabel('From date')
  const start = await from.inputValue()
  await page.getByLabel('To date').fill(start)
  await page.getByRole('button', { name: 'Save dates' }).click()
  await expect(page.getByText(/previous list is still available/)).toBeVisible()
  await page.getByRole('button', { name: 'Save dates' }).press('Enter')
  await expect(page.getByRole('region', { name: 'Shopping period' })).toContainText(
    '1 planned meal',
  )
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await selector.selectOption('week')
  await expect(page.getByRole('button', { name: 'Save dates' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Shopping period' })).toContainText(
    '5 planned meals',
  )
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
})

test('next week is the default and the reported future custom range survives reload at mobile width', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-08T09:29:00'))
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/shopping-period.html')
  const selector = page.getByRole('combobox', { name: 'Buy for' })
  const region = page.getByRole('region', { name: 'Shopping period' })
  await expect(selector).toHaveValue('default')
  await expect(region).toContainText('9 Nov–15 Nov · 5 planned meals')
  await expect(page.getByRole('option', { name: 'Household default (Next week)' })).toHaveCount(1)
  await selector.selectOption('week')
  await expect(region).toContainText('2 Nov–8 Nov')
  await selector.selectOption('custom')
  await page.getByLabel('From date').fill('2026-11-09')
  await page.getByLabel('To date').fill('2026-11-15')
  await page.getByRole('button', { name: 'Save dates' }).click()
  await expect(region).toContainText('9 Nov–15 Nov · 5 planned meals')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
  await page.reload()
  await expect(selector).toHaveValue('custom')
  await expect(page.getByLabel('From date')).toHaveValue('2026-11-09')
  await expect(page.getByLabel('To date')).toHaveValue('2026-11-15')
  await expect(region).toContainText('9 Nov–15 Nov · 5 planned meals')
  await selector.selectOption('nextWeek')
  await expect(region).toContainText('9 Nov–15 Nov · 5 planned meals')
  await expect(page.getByRole('button', { name: 'Save dates' })).toHaveCount(0)
  await selector.selectOption('default')
  await expect(selector).toHaveValue('default')
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('household default lives in Settings while the compact dropdown overrides the current list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/shopping-period.html?settings')
  const defaults = page.getByRole('combobox', { name: 'Default shopping period' })
  await defaults.selectOption('next3')
  await expect(page.getByText('Shopping default saved.')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Primary mobile navigation', exact: true })
    .getByRole('button', { name: 'Shopping', exact: true })
    .click()
  const selector = page.getByRole('combobox', { name: 'Buy for' })
  await expect(selector).toHaveValue('default')
  await expect(selector).toContainText('Household default')
  await selector.selectOption('week')
  await expect(page.getByRole('region', { name: 'Shopping period' })).toContainText(
    '5 planned meals',
  )
  await expect(page.getByRole('button', { name: /Apply|Save dates/ })).toHaveCount(0)
  await expect(page.getByText('Soap', { exact: true })).toBeVisible()
  await selector.selectOption('default')
  await expect(selector).toHaveValue('default')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
