import { expect, it } from 'vitest'
import { delivery, refreshGrant, validateAccess } from './tokenLifecycleModel'

it('routes access and refresh evidence to different receivers', () => {
  expect(delivery('access','resource')).toContain('reaches')
  expect(delivery('refresh','issuer')).toContain('reaches')
  expect(delivery('refresh','resource')).toContain('rejects')
  expect(delivery('access','issuer')).toContain('rejects')
  expect(delivery('none','issuer')).toContain('No credential')
})
it('tests inclusive expiry and independent online and local state', () => {
  for (const format of ['opaque','self-contained'] as const) {
    expect(validateAccess(format,4,false,true)).toContain('Accepted')
    expect(validateAccess(format,5,false,true)).toBe('Expired')
    expect(validateAccess(format,6,false,true)).toBe('Expired')
  }
  expect(validateAccess('opaque',1,true,true)).toBe('Inactive at issuer')
  expect(validateAccess('opaque',1,true,false)).toBe('Introspection unavailable')
  expect(validateAccess('self-contained',1,true,false)).toContain('Accepted')
})
it('retires old handles and fails closed for a closed family', () => {
  const initial={generation:1,revoked:false}
  expect(refreshGrant(initial,2).result).toBe('Unknown handle')
  const rotated=refreshGrant(initial,1).grant
  expect(rotated).toEqual({generation:2,revoked:false})
  const closed=refreshGrant(rotated,1).grant
  expect(closed).toEqual({generation:2,revoked:true})
  expect(refreshGrant(closed,2).grant).toEqual(closed)
})
