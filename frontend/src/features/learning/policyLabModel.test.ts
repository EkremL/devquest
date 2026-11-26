import { expect, it } from 'vitest'
import { evaluateFailure, evaluateGrants, evaluatePolicy, releaseChecks, reviewRelease, traceEnforcement } from './policyLabModel'

it('requires the North operations and removes every excess grant', () => {
  expect(evaluateGrants([]).missing.map(row => row.id)).toEqual(['status', 'download'])
  expect(evaluateGrants(['status', 'download']).minimum).toBe(true)
  for (const extra of ['create', 'share', 'cross'] as const) {
    expect(evaluateGrants(['status', 'download', extra])).toMatchObject({ minimum: false, exposure: [{ id: extra }] })
  }
})

it('permits matching rules and exposes only the unmatched route under the unsafe fallback', () => {
  for (const open of [false, true]) {
    expect(evaluatePolicy('same', open)).toMatchObject({ stop: 'rule', allowed: true })
    expect(evaluatePolicy('cross', open)).toMatchObject({ stop: 'scope', allowed: false })
    expect(evaluatePolicy('anonymous', open)).toMatchObject({ stop: 'identity', allowed: false })
    expect(evaluatePolicy('unmatched', open)).toMatchObject({ stop: 'fallback', allowed: open })
  }
})

it('distinguishes service errors from denial and protects storage in both cases', () => {
  for (const open of [false, true]) {
    expect(evaluateFailure('permit', open)).toMatchObject({ status: 200, opens: true })
    expect(evaluateFailure('denied', open)).toMatchObject({ status: 403, opens: false })
    expect(evaluateFailure('missing', open)).toMatchObject({ status: open ? 200 : 403, opens: open })
    expect(evaluateFailure('offline', open)).toMatchObject({ status: open ? 200 : 503, opens: open })
  }
})

it('requires data-side enforcement independently of browser visibility', () => {
  expect(traceEnforcement('South', 'ui').exposed).toBe(true)
  expect(traceEnforcement('North', 'layered').storage).toBe('Opened')
  expect(traceEnforcement('South', 'service').storage).toBe('Not reached')
  expect(traceEnforcement('South', 'layered').storage).toBe('Not reached')
  expect(traceEnforcement('Storage isolation test', 'service').exposed).toBe(true)
  expect(traceEnforcement('Storage isolation test', 'layered').exposed).toBe(false)
})

it('requires each release-review control to satisfy its own condition', () => {
  const safe = releaseChecks.map(check => check.options[1])
  expect(reviewRelease(safe).every(check => check.passes)).toBe(true)
  for (const [index, check] of releaseChecks.entries()) {
    const partlyFixed: string[] = [...safe]
    partlyFixed[index] = check.options[0]
    expect(reviewRelease(partlyFixed).filter(item => !item.passes).map(item => item.name)).toEqual([check.name])
  }
})
