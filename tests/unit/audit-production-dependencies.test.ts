import { describe, expect, it } from 'vitest'

import { assessProductionAudit } from '../../scripts/engineering/audit-production-dependencies.mjs'

function vulnerability(severity: string, via: unknown[]) {
  return { severity, via }
}

describe('production dependency audit', () => {
  it('accepts only the reviewed React Router RSC advisory and its transitive package', () => {
    const result = assessProductionAudit({
      vulnerabilities: {
        'react-router': vulnerability('high', [
          { url: 'https://github.com/advisories/GHSA-qwww-vcr4-c8h2' },
        ]),
        'react-router-dom': vulnerability('high', ['react-router']),
      },
    })

    expect(result.blocking).toEqual([])
    expect(result.accepted.map(([name]) => name)).toEqual(['react-router', 'react-router-dom'])
  })

  it('blocks every other high or critical production advisory', () => {
    const result = assessProductionAudit({
      vulnerabilities: {
        'react-router': vulnerability('high', [
          { url: 'https://github.com/advisories/GHSA-unreviewed-advisory' },
        ]),
        transitive: vulnerability('critical', ['react-router']),
      },
    })

    expect(result.blocking.map(([name]) => name)).toEqual(['react-router', 'transitive'])
  })

  it('does not block moderate production findings', () => {
    const result = assessProductionAudit({
      vulnerabilities: {
        dependency: vulnerability('moderate', [
          { url: 'https://github.com/advisories/GHSA-moderate-finding' },
        ]),
      },
    })

    expect(result).toEqual({ accepted: [], blocking: [] })
  })
})
