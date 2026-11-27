import { expect, it } from 'vitest'
import { checkJwt, jwtBaseline } from './jwtFoundationsModel'

it('checks the exact lower and upper bounds when the trust checks pass', () => {
  expect(checkJwt({ ...jwtBaseline, now:59 })).toBe('Not active yet')
  expect(checkJwt(jwtBaseline)).toBe('Eligible for authorization')
  expect(checkJwt({ ...jwtBaseline, now:299 })).toBe('Eligible for authorization')
  for (const now of [300,301]) expect(checkJwt({ ...jwtBaseline, now })).toBe('Expired at verifier')
})
it('rejects unapproved algorithms and unusable integrity evidence before claims', () => {
  expect(checkJwt({ ...jwtBaseline, algorithm:'HS256', verified:false })).toBe('Algorithm not allowed by verifier')
  expect(checkJwt({ ...jwtBaseline, verified:false, issuer:'other' })).toBe('Signature check failed')
})
it('enforces the configured issuer and resource independently', () => {
  expect(checkJwt({ ...jwtBaseline, issuer:'other' })).toBe('Issuer mismatch')
  expect(checkJwt({ ...jwtBaseline, audience:'other' })).toBe('Audience mismatch')
})
