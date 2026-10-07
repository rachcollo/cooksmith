import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('prepared freezer lifecycle works at 320px with explicit consumption and undo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 })
  page.on('dialog', (dialog) => void dialog.accept())
  await page.goto('/tests/e2e/fixtures/freezer.html')
  await page.getByRole('button', { name: 'Add meal', exact: true }).click()
  await page.getByRole('combobox', { name: 'Meal name' }).fill('Freezer curry')
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
  await page.getByRole('button', { name: /Freezer meals/ }).click()
  await expect(page.getByText('2 available · 0 reserved · 2 in freezer')).toBeVisible()
  await page.getByRole('button', { name: 'Archive freezer meal Freezer curry' }).click()
  await page.getByRole('button', { name: 'Show archived meals' }).click()
  await page.getByRole('button', { name: 'Restore freezer meal Freezer curry' }).click()
  await page.getByRole('button', { name: 'Show active meals' }).click()
  await expect(page.getByText('2 available · 0 reserved · 2 in freezer')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('compact freezer opens recipe search and preserves manual long names without covering Pantry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 })
  await page.goto('/tests/e2e/fixtures/freezer.html')
  const section = page.getByRole('region', { name: 'Freezer meals', exact: true })
  await expect(section).toContainText('0 meals · 0 available')
  expect((await section.boundingBox())!.height).toBeLessThan(140)
  await expect(page.getByRole('button', { name: 'Refresh stock' })).toBeHidden()
  const toolbar = await page.getByRole('button', { name: 'Add pantry item' }).boundingBox()
  const navigation = await page
    .getByRole('navigation', { name: 'Primary mobile navigation', exact: true })
    .boundingBox()
  expect(toolbar!.y + toolbar!.height).toBeLessThan(navigation!.y)
  await page.screenshot({ path: testInfo.outputPath('freezer-compact-empty.png'), fullPage: true })
  await page.getByRole('button', { name: 'Add meal', exact: true }).click()
  const search = page.getByRole('combobox', { name: 'Meal name' })
  await search.fill('lentil')
  await expect(page.getByRole('option', { name: /Lentil soup.*Household recipe/ })).toBeVisible()
  await search.press('Enter')
  await expect(
    page.getByText('Recipe linked. Its ingredients will not be added to Shopping.'),
  ).toBeVisible()
  await expect(page.getByLabel('Add to this day')).toBeVisible()
  await search.fill('Homemade roasted vegetable and chickpea soup for a busy family evening')
  await search.press('Enter')
  await expect(search).toHaveValue(
    'Homemade roasted vegetable and chickpea soup for a busy family evening',
  )
  await page.getByRole('button', { name: 'Save freezer meal' }).click()
  await expect(page.getByRole('heading', { name: /Homemade roasted vegetable/ })).toBeVisible()
  await page.getByRole('button', { name: /Freezer meals.*1 meal/ }).click()
  await expect(page.getByRole('heading', { name: /Homemade roasted vegetable/ })).toBeHidden()
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
