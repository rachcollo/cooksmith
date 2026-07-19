import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  formatVerification,
  verifyDeployment,
} from '../../scripts/engineering/verify-deployment.mjs'

function textResponse(body: string, status = 200) {
  return { ok: status < 300, status, text: async () => body }
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 300, status, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyDeployment', () => {
  it('passes when health.json and the application shell both respond correctly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ application: 'cooksmith-v2', status: 'ok' }))
      .mockResolvedValueOnce(textResponse('<html><body><div id="root"></div></body></html>'))
    vi.stubGlobal('fetch', fetchMock)

    const result = formatVerification(await verifyDeployment('https://cooksmith.example.com/'))

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://cooksmith.example.com/health.json')
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://cooksmith.example.com')
  })

  it('fails when health.json reports the wrong application', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ application: 'other-app', status: 'ok' }))
      .mockResolvedValueOnce(textResponse('<div id="root"></div>'))
    vi.stubGlobal('fetch', fetchMock)

    const result = formatVerification(await verifyDeployment('https://cooksmith.example.com'))

    expect(result.ok).toBe(false)
    expect(result.text).toContain('unexpected content')
  })

  it('fails when the deployment is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network unreachable'))
    vi.stubGlobal('fetch', fetchMock)

    const result = formatVerification(await verifyDeployment('https://cooksmith.example.com'))

    expect(result.ok).toBe(false)
    expect(result.text).toContain('was unreachable')
  })

  it('fails when the application shell is missing from the root response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ application: 'cooksmith-v2', status: 'ok' }))
      .mockResolvedValueOnce(textResponse('<html><body>unexpected</body></html>'))
    vi.stubGlobal('fetch', fetchMock)

    const result = formatVerification(await verifyDeployment('https://cooksmith.example.com'))

    expect(result.ok).toBe(false)
    expect(result.text).toContain('did not serve the expected application shell')
  })
})
