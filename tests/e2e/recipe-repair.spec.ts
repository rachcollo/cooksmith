import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
test('selected repair remains accessible and shows its cost at 320px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/recipe-repair.html')
  await page.getByRole('button', { name: 'Inspect Family vegetable soup' }).click()
  await expect(page.getByRole('heading', { name: 'Family vegetable soup' })).toBeFocused()
  await expect(page.getByText(/AI output did not pass validation/)).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Repair this recipe' }).click()
  await expect(page.getByText('Estimated cost: A$0.001234')).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('selected-repair-320.png'), fullPage: true })
})
