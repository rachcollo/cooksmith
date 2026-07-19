import { expect, test, type Page } from '@playwright/test'

// Full product journey against the local Supabase stack: create an account,
// confirm email through the local mail catcher, complete onboarding, add a
// recipe, plan a dinner from it, then generate and tick off the shopping list.
// Requires `npm run db:start` plus VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY in the dev server environment; without them the
// suite skips so the databaseless smoke run stays green.

const databaseConfigured = Boolean(process.env.VITE_SUPABASE_URL)
const mailApiBase = process.env.COOKSMITH_MAIL_API ?? 'http://127.0.0.1:54324'

test.describe('core household journey', () => {
  test.skip(!databaseConfigured, 'Local Supabase is not configured for this run.')
  test('a new household plans a dinner and shops from it', async ({ page }) => {
    test.setTimeout(180_000)
    const stamp = Date.now()
    const email = `journey-${stamp}@cooksmith.test`
    const password = `Journey${stamp}pw1`

    await page.goto('/auth/create-account')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/^Password/).fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

    const confirmationUrl = await fetchConfirmationLink(page, email)
    await page.goto(confirmationUrl)

    await expect(page).toHaveURL(/onboarding/, { timeout: 20_000 })
    await page.getByLabel('Display name').fill('Journey Cook')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByLabel('Household name').fill('The Journey household')
    await page.getByRole('button', { name: 'Create household' }).click()

    await expect(page.getByRole('heading', { name: 'Make planning fit real life' })).toBeVisible()
    await page.getByRole('button', { name: 'Save preferences' }).click()

    await expect(page.getByRole('heading', { name: 'Keep every meal suitable' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish setup' }).click()
    await page.getByRole('button', { name: 'Enter Cooksmith' }).click()
    await expect(page).toHaveURL(/\/$/)

    await page.goto('/recipes')
    await page.getByRole('button', { name: 'Add recipe' }).click()
    await page.getByLabel('Recipe name').fill('Journey lentil soup')
    await page.getByLabel('Ingredients').fill('1 cup brown lentils\n2 carrot\n1 brown onion')
    await page.getByLabel('Instructions').fill('Simmer everything.\nSeason and serve.')
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(
      page.getByRole('button', { name: 'Open Journey lentil soup recipe' }),
    ).toBeVisible()

    await page.goto('/plan')
    await page.getByRole('button', { name: 'Add dinner' }).first().click()
    await page.getByLabel('Start with').selectOption({ label: 'Journey lentil soup' })
    await expect(page.getByLabel(/^Dinner/)).toHaveValue('Journey lentil soup')
    await page.getByRole('button', { name: 'Save dinner' }).click()
    await expect(page.getByRole('button', { name: /Journey lentil soup/ }).first()).toBeVisible()

    await page.goto('/shopping')
    await page.getByRole('button', { name: "Add this week's meals" }).click()
    const preview = page.getByRole('dialog', { name: "Add this week's meals" })
    await expect(preview.getByText('1 cup brown lentils')).toBeVisible()
    await preview.getByRole('button', { name: /^Add \d+ items?$/ }).click()
    await expect(page.getByText(/Added \d+ items? from this week's meals\./)).toBeVisible()
    await expect(page.getByText('1 cup brown lentils')).toBeVisible()

    await page.getByRole('button', { name: 'Mark as done: 1 cup brown lentils' }).click()
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()
  })
})

async function fetchConfirmationLink(page: Page, email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const link = (await readFromMailpit(page, email)) ?? (await readFromInbucket(page, email))
    if (link) return link
    await page.waitForTimeout(1000)
  }
  throw new Error(`No confirmation email arrived for ${email}.`)
}

function extractVerifyLink(source: string): string | null {
  const match = source.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/)
  return match ? match[0].replace(/&amp;/g, '&') : null
}

async function readFromMailpit(page: Page, email: string): Promise<string | null> {
  try {
    const search = await page.request.get(
      `${mailApiBase}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    if (!search.ok()) return null
    const results = (await search.json()) as { messages?: { ID: string }[] }
    const id = results.messages?.[0]?.ID
    if (!id) return null
    const message = await page.request.get(`${mailApiBase}/api/v1/message/${id}`)
    if (!message.ok()) return null
    const body = (await message.json()) as { Text?: string; HTML?: string }
    return extractVerifyLink(`${body.Text ?? ''}\n${body.HTML ?? ''}`)
  } catch {
    return null
  }
}

async function readFromInbucket(page: Page, email: string): Promise<string | null> {
  try {
    const mailbox = email.split('@')[0] ?? email
    const listing = await page.request.get(`${mailApiBase}/api/v1/mailbox/${mailbox}`)
    if (!listing.ok()) return null
    const messages = (await listing.json()) as { id: string }[]
    const latest = messages[messages.length - 1]
    if (!latest) return null
    const message = await page.request.get(`${mailApiBase}/api/v1/mailbox/${mailbox}/${latest.id}`)
    if (!message.ok()) return null
    const body = (await message.json()) as { body?: { text?: string; html?: string } }
    return extractVerifyLink(`${body.body?.text ?? ''}\n${body.body?.html ?? ''}`)
  } catch {
    return null
  }
}
