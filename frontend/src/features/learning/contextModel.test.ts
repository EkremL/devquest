import { expect, it } from 'vitest'
import { cleanupContract, taskTrace, trustRecords } from './contextModel'
it('distinguishes the anonymous flag from verified trust',()=>{
  expect(trustRecords['Anonymous token']).toMatchObject({flag:'true',accepted:false})
  expect(trustRecords['Verified token']).toMatchObject({flag:'true',accepted:true})
  expect(trustRecords['Submitted token'].accepted).toBe(false)
  expect(trustRecords['Empty context'].accepted).toBe(false)
})
it('keeps a worker empty by default and restores the baseline on exception',()=>{
  expect(taskTrace(false,false).during).toBe('Empty worker context')
  expect(taskTrace(true,false).during).toBe('Verified task identity')
  expect(taskTrace(true,true)).toMatchObject({terminal:'Task raised its fixture exception',after:'Empty worker baseline'})
})
it('requires trust, scoped propagation and exception cleanup evidence',()=>{
  expect(cleanupContract(false,true,true)).not.toBe('Context contract verified')
  expect(cleanupContract(true,false,true)).not.toBe('Context contract verified')
  expect(cleanupContract(true,true,false)).not.toBe('Context contract verified')
  expect(cleanupContract(true,true,true)).toBe('Context contract verified')
})
