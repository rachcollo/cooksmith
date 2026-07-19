import { describe, expect, it } from 'vitest'

import { createDeliverySummary } from '../../scripts/engineering/create-delivery-summary.mjs'

describe('createDeliverySummary', () => {
  it('renders every evidence field for a fully reported delivery', () => {
    const summary = createDeliverySummary({
      jiraKey: 'CS-21',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/45',
      mergeCommit: 'abc123',
      releaseCommit: 'def456',
      appStatus: 'Deployed to production',
      dbStatus: 'Migrations applied',
      edgeStatus: 'No Edge Function changes',
      verificationUrl: 'https://cooksmith.example.com/health.json',
    })

    expect(summary).toContain('CS-21')
    expect(summary).toContain('https://github.com/rachcollo/cooksmith/pull/45')
    expect(summary).toContain('abc123')
    expect(summary).toContain('def456')
    expect(summary).toContain('Deployed to production')
    expect(summary).toContain('Migrations applied')
    expect(summary).toContain('No Edge Function changes')
    expect(summary).toContain('https://cooksmith.example.com/health.json')
  })

  it('reports missing evidence explicitly instead of omitting it', () => {
    const summary = createDeliverySummary({})

    expect(summary).toContain('unknown issue')
    expect(summary).toContain('not recorded')
    expect(summary).toContain('not reported')
  })
})
