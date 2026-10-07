import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
async function accessible(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    // Measure settled colours, not the dialog's intermediate entrance opacity.
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
test('Home, Pantry suggestions, recipes and authorised Admin remain usable at 320px', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/polish.html')
  await expect(page.getByText('Family lentil soup', { exact: true })).toBeVisible()
  await expect(page.getByText('Everything on your list is bought.')).toBeVisible()
  await accessible(page)
  for (const link of await page.locator('.home-overview .button').all()) {
    const box = await link.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('link', { name: 'Check Pantry', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Review pantry suggestions' }).click()
  const dialog = page.getByRole('dialog', { name: 'Pantry suggestions' })
  await expect(dialog.getByText('Milk', { exact: true })).toBeVisible()
  const add = dialog.getByRole('button', { name: 'Add to Shopping', exact: true })
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await accessible(page)
  await page.screenshot({ path: testInfo.outputPath('pantry-suggestions-320.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await page
    .getByRole('navigation', { name: 'Primary mobile navigation', exact: true })
    .getByRole('link', { name: 'Recipes', exact: true })
    .click()
  await page.getByRole('button', { name: 'Open Family lentil soup recipe' }).click()
  const recipe = page.getByRole('dialog', { name: 'Family lentil soup' })
  await expect(recipe.getByRole('heading', { name: 'Ingredients', exact: true })).toBeVisible()
  await expect(recipe.getByText('By Synthetic Cook')).toBeVisible()
  await expect(recipe.getByRole('link', { name: /Original recipe/ })).toHaveAttribute(
    'href',
    'https://example.invalid/lentil-soup',
  )
  await expect(recipe.getByText('Not set', { exact: true })).toHaveCount(0)
  await accessible(page)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('menuitem', { name: 'Admin', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Feature toggles', exact: true })).toBeVisible()
  await accessible(page)
})
test('new household Home supports enlarged text and hides Admin for members', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/polish.html?empty&member')
  await expect(page.getByRole('link', { name: 'Plan a meal', exact: true })).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await accessible(page)
  expect(
    await page.locator('.header-inner .brand strong').evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return range.getClientRects().length
    }),
  ).toBe(1)
  expect(
    await page.locator('.home-overview h1').evaluate((element) => {
      const text = element.firstChild!
      const start = text.textContent!.indexOf('decisions')
      const range = document.createRange()
      range.setStart(text, start)
      range.setEnd(text, start + 'decisions'.length)
      return range.getClientRects().length
    }),
  ).toBe(1)
  await page.screenshot({ path: testInfo.outputPath('home-320-text-resize.png'), fullPage: true })
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Admin', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeFocused()
})
