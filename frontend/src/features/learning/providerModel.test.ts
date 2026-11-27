import { expect, it } from 'vitest'
import { daoResult, providerContract, providerRoute } from './providerModel'
it('routes typed inputs and handles unsupported input',()=>{
  expect(providerRoute('Username/password')).toBe('DAO provider')
  expect(providerRoute('Bearer token')).toBe('JWT provider')
  expect(providerRoute('Unsupported token')).toBe('ProviderNotFoundException')
})
it('separates matching proof from eligibility',()=>{
  expect(daoResult('Active',true)).toBe('Authenticated result returned')
  expect(daoResult('Active',false)).toBe('BadCredentialsException')
  expect(daoResult('Locked',true)).toBe('LockedException')
  expect(daoResult('Disabled',true)).toBe('DisabledException')
})
it('requires routing, account-status checks and credential erasure',()=>{
  expect(providerContract(false,true,true)).not.toBe('Provider contract verified')
  expect(providerContract(true,false,true)).not.toBe('Provider contract verified')
  expect(providerContract(true,true,false)).not.toBe('Provider contract verified')
  expect(providerContract(true,true,true)).toBe('Provider contract verified')
})
