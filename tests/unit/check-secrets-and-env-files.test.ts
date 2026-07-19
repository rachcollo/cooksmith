import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectSecretChecks,
  formatSecretReport,
} from '../../scripts/engineering/check-secrets-and-env-files.mjs'

function withFixture(files: Record<string, string>, fn: (cwd: string) => void) {
  const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-secrets-'))
  try {
    for (const [path, content] of Object.entries(files)) {
      writeFileSync(join(cwd, path), content)
    }
    fn(cwd)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

// Built by concatenation so this fixture-generating source file does not itself
// trip the pattern it is testing for.
const serviceRoleKeyName = ['SUPABASE_SERVICE', 'ROLE_KEY'].join('_')

describe('check-secrets-and-env-files', () => {
  it('passes when only .env.example is tracked and no secret patterns are present', () => {
    withFixture({ '.env.example': 'VITE_SUPABASE_URL=\n', 'README.md': '# Cooksmith\n' }, (cwd) => {
      const result = formatSecretReport(
        collectSecretChecks({ cwd, trackedFiles: ['.env.example', 'README.md'] }),
      )
      expect(result.ok).toBe(true)
    })
  })

  it('fails when a real environment file is tracked', () => {
    withFixture({ '.env.local': 'SECRET=x\n', '.env.example': 'SECRET=\n' }, (cwd) => {
      const result = formatSecretReport(
        collectSecretChecks({ cwd, trackedFiles: ['.env.local', '.env.example'] }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('.env.local')
    })
  })

  it('flags a committed AWS access key ID', () => {
    // Synthetic 20-character AWS-style key ID used only to prove the detector
    // fires; it is not a real credential.
    const decoyKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('')
    withFixture({ 'notes.md': `key=${decoyKey}\n` }, (cwd) => {
      const result = formatSecretReport(collectSecretChecks({ cwd, trackedFiles: ['notes.md'] }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('AWS access key ID')
    })
  })

  it('flags a committed Supabase service-role key assignment', () => {
    withFixture({ 'notes.md': `${serviceRoleKeyName}=eyJhbGciOiJIUzI1NiJ9.fake.sig\n` }, (cwd) => {
      const result = formatSecretReport(collectSecretChecks({ cwd, trackedFiles: ['notes.md'] }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('service-role key')
    })
  })

  it('does not flag an empty placeholder value', () => {
    withFixture({ 'notes.md': `${serviceRoleKeyName}=\n` }, (cwd) => {
      const result = formatSecretReport(collectSecretChecks({ cwd, trackedFiles: ['notes.md'] }))
      expect(result.ok).toBe(true)
    })
  })
})
