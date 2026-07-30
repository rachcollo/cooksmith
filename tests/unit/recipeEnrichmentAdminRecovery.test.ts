import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/routes/AdminPage.tsx'), 'utf8')
const repository = readFileSync(
  resolve(
    process.cwd(),
    'src/infrastructure/admin/supabaseWeeklyPreparationAdminRepository.ts',
  ),
  'utf8',
)

describe('recipe enrichment admin recovery', () => {
  it('shows the exact recoverable count and requires explicit confirmation', () => {
    expect(page).toContain('Recover exhausted AI failures ({status.recoverableCount})')
    expect(page).toContain('Recover exactly ${status?.recoverableCount ?? 0} exhausted AI failures?')
    expect(page).toContain("command('recover_exhausted_ai_failures')")
    expect(page).toContain('status.recoverableCount === 0')
  })

  it('ignores stale refresh responses and clears resolved errors', () => {
    expect(page).toContain('const refreshSequence = useRef(0)')
    expect(page).toContain('const sequence = ++refreshSequence.current')
    expect(page).toContain('if (sequence !== refreshSequence.current) return')
    expect(page).toContain("setMessage('')")
    expect(repository).toContain("return this.getRecipeEnrichmentStatus()")
  })
})
