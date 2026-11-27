import { expect, it } from 'vitest'
import { browserGate, configContract, restoredIdentity, reviewedRule } from './configReviewModel'

it('orders precise public exceptions before the guard and closes near misses',()=>{
  expect(reviewedRule('GET /api/status',false)).toBe('API guard selected')
  expect(reviewedRule('GET /api/status',true)).toBe('Public GET rule selected')
  expect(reviewedRule('POST /api/status',true)).toBe('API guard selected')
  expect(reviewedRule('GET /api/status/detail',true)).toBe('API guard selected')
  expect(reviewedRule('GET /other',true)).toBe('Deny-all fallback selected')
})
it('restores identity only through the stated saved session policy',()=>{
  expect(restoredIdentity(false,true)).toBe('New evidence required')
  expect(restoredIdentity(true,false)).toBe('New evidence required')
  expect(restoredIdentity(true,true)).toBe('Saved context restored')
})
it('handles CORS and CSRF independently and requires release evidence',()=>{
  expect(browserGate(true,false,true)).toBe('Origin refused by CORS')
  expect(browserGate(true,true,false)).toBe('Preflight accepted')
  expect(browserGate(false,true,false)).toBe('Actual POST blocked by CSRF')
  expect(browserGate(false,true,true)).toBe('Protected POST proceeds')
  expect(configContract(true,true,false)).toBe('Include the public and fallback probes')
  expect(configContract(true,true,true)).toBe('Security policy revision verified')
})
