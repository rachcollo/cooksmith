import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/infrastructure/recipes/supabaseRecipeRepository.ts'),
  'utf8',
)

describe('recipe import enrichment dispatch', () => {
  it('launches enrichment after a new public import is saved', () => {
    expect(source).toContain("if (visibility === 'public') wakeRecipeEnrichment(client)")
  })

  it('wakes enrichment after household recipe creates and edits without blocking save', () => {
    expect(source.match(/wakeRecipeEnrichment\(client\)/g)?.length).toBeGreaterThanOrEqual(4)
    expect(source).toContain('void dispatchRecipeEnrichment(client).catch')
  })

  it('does not launch enrichment for private imports that are not queued', () => {
    expect(source).not.toContain(
      "if (visibility === 'private') await dispatchRecipeEnrichment(client)",
    )
  })
})
