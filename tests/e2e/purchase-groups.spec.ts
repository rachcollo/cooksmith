import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function accessibility(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getComputedTiming().endTime !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
  return (await new AxeBuilder({ page }).analyze()).violations
}

test('synthetic authenticated shopping purchases remain concise and usable', async ({
  page,
}, testInfo) => {
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await expect(page.getByText('70 ml + 3 tbsp', { exact: true })).toBeVisible()
  await expect(page.getByText('50 g + to taste', { exact: true })).toBeVisible()
  await expect(page.getByText('about 200 g', { exact: true })).toBeVisible()
  await expect(page.getByText('fine sea salt', { exact: true })).toBeVisible()
  await expect(page.getByText('extra virgin olive oil', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Recipe amounts', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await accessibility(page)).toEqual([])
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
  expect(await accessibility(page)).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('shopping-320.png'), fullPage: true })
})

test('manual cup settings produce a single approximate weight', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await page.getByRole('button', { name: 'Edit caster sugar', exact: true }).click()
  await page.getByLabel('Cup and spoon measures').selectOption('au')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await accessibility(page)).toEqual([])
  await page.getByRole('button', { name: 'Save changes to caster sugar', exact: true }).click()
  await expect(page.getByText('about 220 g', { exact: true })).toBeVisible()
})

test('legacy bought items need no release-maintenance action on a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await expect(
    page.getByRole('button', { name: 'Mark as needed: brown sugar', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Refresh recipe amounts', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Mark as needed: brown sugar', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await accessibility(page)).toEqual([])
})

test('a combined purchase can confirm unresolved spoon sizes on a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html')
  await page.getByRole('button', { name: 'Edit extra virgin olive oil', exact: true }).click()
  await page.getByLabel('Cup and spoon measures').selectOption('au')
  expect(await accessibility(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('130 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('70 ml + 3 tbsp', { exact: true })).toHaveCount(0)
})

test('multiple mobile edits keep one small mark per row and match a fresh render', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/tests/e2e/fixtures/purchases.html?edits')
  async function checkMarks() {
    await page.evaluate(() => document.fonts.ready)
    const rows = page.locator('.shopping-item')
    for (const row of await rows.all()) {
      const button = row.locator('.shopping-check')
      const mark = button.locator('.shopping-check-mark')
      await expect(button).toHaveCount(1)
      await expect(mark).toHaveCount(1)
      const hit = (await button.boundingBox())!,
        glyph = (await mark.boundingBox())!,
        bounds = (await row.boundingBox())!
      expect(hit.width).toBeGreaterThanOrEqual(44)
      expect(hit.height).toBeGreaterThanOrEqual(44)
      expect(glyph.width).toBeLessThanOrEqual(22)
      expect(glyph.height).toBeLessThanOrEqual(22)
      expect(glyph.x).toBeGreaterThanOrEqual(hit.x)
      expect(glyph.y).toBeGreaterThanOrEqual(hit.y)
      expect(glyph.y + glyph.height).toBeLessThanOrEqual(hit.y + hit.height)
      expect(glyph.y).toBeGreaterThanOrEqual(bounds.y)
      expect(glyph.y + glyph.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await expect(page.getByRole('button', { name: 'Edit tomato', exact: true })).toBeVisible()
  await checkMarks()
  for (const [name, quantity, nextName] of [
    ['tomato', '6', 'tomato for the week'],
    ['green capsicum', '7', 'green capsicum'],
    ['coriander', '2', 'coriander'],
    ['tomato for the week', '5', 'cherry tomatoes for a long household shopping reminder'],
  ]) {
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click()
    const form = page.locator('.shopping-inline-edit')
    await form.getByLabel('Quantity', { exact: true }).fill(quantity!)
    await form.getByLabel('Item name', { exact: true }).fill(nextName!)
    await page.getByRole('button', { name: `Save changes to ${name}`, exact: true }).click()
    await expect(page.locator('.shopping-inline-edit')).toHaveCount(0)
    const row = page
      .locator('.shopping-item')
      .filter({ has: page.getByRole('button', { name: `Edit ${nextName}`, exact: true }) })
    await expect(row.locator('.shopping-item-description')).toHaveText(
      `${quantity}${nextName === 'coriander' ? ' bunch' : ''} ${nextName}`,
    )
    await checkMarks()
  }
  await page.getByRole('button', { name: 'Mark as done: green capsicum', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Mark as needed: green capsicum', exact: true }),
  ).toBeEnabled()
  await checkMarks()
  const descriptions = await page.locator('.shopping-item-description').allTextContents()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Mark as needed: green capsicum', exact: true }),
  ).toBeVisible()
  expect(await page.locator('.shopping-item-description').allTextContents()).toEqual(descriptions)
  await checkMarks()
  expect(await accessibility(page)).toEqual([])
})
