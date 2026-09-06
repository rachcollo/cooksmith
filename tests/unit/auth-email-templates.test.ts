import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('Supabase authentication email templates', () => {
  it('configures password recovery with a cross-browser token-hash link', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    const recovery = readFileSync('supabase/templates/recovery.html', 'utf8')

    expect(config).toContain('[auth.email.template.recovery]')
    expect(config).toContain('content_path = "./supabase/templates/recovery.html"')
    expect(recovery).toContain(
      'href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery"',
    )
    expect(recovery).not.toContain('{{ .ConfirmationURL }}')
  })
})
