import { expect, it } from 'vitest'
import { inspectCookie, inspectLogout, inspectRotation, lookupNode, requestWindow, signInSteps,
  sustainWindow, windowStart, windowStatus, type CookieProbe } from './sessionLabModel'

it('distinguishes a pre-login record, a verified request, saved context and restored context', () => {
  expect(signInSteps[1]).toMatchObject({ record: 'Anonymous · form state', context: 'None' })
  expect(signInSteps[3].context).toContain('current request')
  expect(signInSteps[4].record).toContain('authenticated')
  expect(signInSteps[5].message).toContain('Set-Cookie: ROSTER_SESSION=demo-auth')
  expect(signInSteps[6].message).toContain('Cookie: ROSTER_SESSION=demo-auth')
})

const secure: CookieProbe = { secure:true, httpOnly:true, sameSite:'Lax', secureTransport:true, host:'roster.example.test', path:'/roster/today', context:'same-site' }
it('applies explicit scope, Secure, and SameSite without using HttpOnly as network access control', () => {
  expect(inspectCookie(secure)).toMatchObject({ sent:true, scriptReadable:false, request:'Cookie: ROSTER_SESSION=demo-opaque' })
  expect(inspectCookie({ ...secure,httpOnly:false })).toMatchObject({ sent:true,scriptReadable:true })
  expect(inspectCookie({ ...secure,host:'ops.example.test' }).sent).toBe(false)
  expect(inspectCookie({ ...secure,path:'/roster-old' }).sent).toBe(false)
  expect(inspectCookie({ ...secure,path:'/roster' }).sent).toBe(true)
  expect(inspectCookie({ ...secure,secureTransport:false }).sent).toBe(false)
  expect(inspectCookie({ ...secure,context:'top-level-get' }).sent).toBe(true)
  expect(inspectCookie({ ...secure,context:'top-level-get',sameSite:'Strict' }).sent).toBe(false)
  expect(inspectCookie({ ...secure,context:'cross-site-post' }).sent).toBe(false)
  expect(inspectCookie({ ...secure,context:'cross-site-post',sameSite:'None' }).sent).toBe(true)
  expect(inspectCookie({ ...secure,secure:false,sameSite:'None' })).toMatchObject({ stored:false,sent:false,scriptReadable:false })
})

it('tests both deadlines without extending absolute lifetime or reviving an expired or invalidated record', () => {
  expect(windowStatus({ ...windowStart,now:14 })).toBe('Active')
  for (const now of [15,16]) {
    const expired = { ...windowStart,now }
    expect(windowStatus(expired)).toBe('Idle timeout expired')
    expect(requestWindow(expired)).toBe(expired)
  }
  const renewed = requestWindow({ ...windowStart,now:14 })
  expect(renewed.last).toBe(14)
  expect(windowStatus({ ...renewed,now:28 })).toBe('Active')
  const nearLimit = sustainWindow({ ...windowStart,now:14 })
  expect(nearLimit).toMatchObject({ now:479,last:479 })
  expect(windowStatus(nearLimit)).toBe('Active')
  for (const now of [480,481]) {
    const expired = { ...nearLimit,now }
    expect(windowStatus(expired)).toBe('Absolute lifetime expired')
    expect(requestWindow(expired)).toBe(expired)
  }
  const invalidated = { ...nearLimit,invalidated:true }
  expect(windowStatus(invalidated)).toBe('Invalidated')
  expect(requestWindow(invalidated)).toBe(invalidated)
})

it('separates local ownership, shared lookup and repository outage', () => {
  const local = { mode:'local',available:true,signedIn:true } as const
  expect(lookupNode(local,'A').readable).toBe(true)
  expect(lookupNode(local,'B').result).toBe('Session record missing')
  expect(lookupNode({...local,mode:'shared'},'B').readable).toBe(true)
  expect(lookupNode({...local,mode:'shared',available:false},'B')).toMatchObject({ readable:false,result:'Repository unavailable' })
  expect(lookupNode({...local,signedIn:false},'A').result).toBe('No session cookie')
})

it('distinguishes identifier rotation, client cleanup and server invalidation', () => {
  expect(inspectRotation(false)).toMatchObject({current:'demo-pre',originalResolves:true})
  expect(inspectRotation(true)).toMatchObject({current:'demo-new',originalResolves:false,state:'Form state retained'})
  expect(inspectLogout('cookie')).toMatchObject({cookie:false,session:true,nextContext:true})
  expect(inspectLogout('invalidate')).toMatchObject({cookie:true,session:false,nextContext:false})
  expect(inspectLogout('complete')).toMatchObject({cookie:false,session:false,nextContext:false})
})
