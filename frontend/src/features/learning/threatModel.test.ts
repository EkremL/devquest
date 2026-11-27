import { describe, expect, it } from 'vitest'
import { completion, containment, incidentSignals, transition } from './threatModel'

describe('defensive incident fixtures',()=>{
  it('keeps local freshness, live withdrawal and outage independent',()=>{
    expect(containment(4,true,false,true)).toBe('Eligible on time alone')
    expect(containment(4,false,true,true)).toBe('Current evidence verified')
    expect(containment(4,true,true,true)).toBe('Withdrawal observed')
    expect(containment(4,false,true,false)).toBe('Protected response withheld')
    expect(containment(5,false,true,true)).toBe('Expired evidence')
  })
  it('requires a completed factor and current state',()=>{
    expect(completion('Pending',true)).toBe('No authenticated principal')
    expect(completion('Rejected',true)).toBe('No authenticated principal')
    expect(completion('Verified',true)).toBe('Verified principal established')
    expect(completion('Verified',false)).toBe('No current session')
  })
  it('distinguishes hypotheses and checks only corrected session states',()=>{
    expect(incidentSignals.map(signal=>signal.finding)).toEqual(['Focused guessing suspected','Credential reuse suspected','Exposure confirmed'])
    expect(transition.map(step=>step.reference)).toEqual(['Anonymous A','Authenticated B','Invalidated B'])
  })
})
