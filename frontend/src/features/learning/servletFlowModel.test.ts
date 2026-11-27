import { expect, it } from 'vitest'
import { invocationTrace, selectedChain, traceObserver } from './servletFlowModel'

it('wraps downstream MVC and records the short path separately',()=>{
  expect(invocationTrace(true)).toEqual(['Filter before','MVC handler','Filter after'])
  expect(invocationTrace(false)).toEqual(['Filter before','Filter writes response'])
})
it('uses the first matching filter list without merging it',()=>{
  expect(selectedChain('/exports/today','Exports first')).toBe('Export chain')
  expect(selectedChain('/profile','Exports first')).toBe('Fallback chain')
  expect(selectedChain('/exports/today','Fallback first')).toBe('Fallback chain')
})
it('separates the active chain, observer order and visible diagnostics',()=>{
  expect(traceObserver('/exports/today','Fallback first','After metadata',true).detail).toBe('Export observer absent from this chain')
  expect(traceObserver('/exports/today','Exports first','Before metadata',true).detail).toBe('Observer has no route metadata')
  expect(traceObserver('/exports/today','Exports first','After metadata',true)).toEqual({
    selected:'Export chain',detail:'Observer has route metadata',visible:true,
  })
  expect(traceObserver('/exports/today','Exports first','After metadata',false).visible).toBe(false)
})
