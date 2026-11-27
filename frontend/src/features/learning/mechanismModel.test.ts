import { describe, expect, it } from 'vitest'
import { paths, storage, withdrawal } from './mechanismModel'

describe('comparison fixtures',()=>{
  it('separates the timely lookup decision from local JWT eligibility',()=>{
    expect(withdrawal('Opaque token',false,true,4)).toBe('Eligible after current lookup')
    expect(withdrawal('Opaque token',true,true,4)).toBe('Withdrawn at current lookup')
    expect(withdrawal('Opaque token',true,false,4)).toBe('Required authority unavailable')
    expect(withdrawal('JWT access token',true,false,4)).toBe('Locally eligible')
    expect(withdrawal('JWT access token',false,true,5)).toBe('Lifetime ended')
  })
  it('declares each fixture’s dependency and approved storage',()=>{
    expect(paths['Opaque token'].visits).toBe(1)
    expect(paths['JWT access token'].visits).toBe(0)
    expect(paths['Mutual TLS'].verifier).toContain('TLS endpoint')
    expect(storage.map(row=>row.expected)).toEqual(['Scoped HttpOnly cookie','Workload secret store','Managed key provider'])
  })
})
