import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RequestTriage } from './SecurityResponseLab'
import { commitResponse, matchRule, securityTrace, successfulContract } from './securityDebuggerModel'

it('distinguishes the two Basic 401 invokers and does not enter the wrapper on invalid credentials', () => {
  const missing=securityTrace('missing')
  const invalid=securityTrace('invalid')
  expect(missing).toMatchObject({status:401,caller:'wrapper',writer:'entry',edge:'exception'})
  expect(invalid).toMatchObject({status:401,caller:'basic',writer:'entry',edge:'direct'})
  expect(missing.steps.map(step=>step.id)).toEqual(['request','basic','context','wrapper','authorization','wrapper','entry'])
  expect(invalid.steps.map(step=>step.id)).toEqual(['request','basic','manager','entry'])
  expect(successfulContract(401)).toContain('WWW-Authenticate: Basic')
})

it('routes verified insufficient authority and sufficient authority to distinct writers', () => {
  expect(securityTrace('creator')).toMatchObject({status:403,caller:'wrapper',writer:'denied',edge:'exception'})
  expect(securityTrace('reader')).toMatchObject({status:200,caller:'authorization',writer:'controller',edge:'normal'})
  expect(securityTrace('creator').steps.some(step=>step.id==='controller')).toBe(false)
  expect(securityTrace('reader').steps.filter(step=>step.id==='wrapper')).toHaveLength(1)
  expect(successfulContract(403)).not.toContain('WWW-Authenticate')
})

it('drops a late challenge and repairs the complete 401 and 403 contracts independently', () => {
  const corrected={status:401,challenge:true,media:'json',safe:true,early:true} as const
  const late=commitResponse(401,{...corrected,early:false})
  expect(late.mistakes.some(message=>message.includes('after commitment'))).toBe(true)
  expect(late.text).not.toContain('WWW-Authenticate')
  expect(commitResponse(401,corrected).mistakes).toEqual([])
  expect(commitResponse(403,{...corrected,status:403,challenge:false}).mistakes).toEqual([])
  expect(commitResponse(403,{...corrected,status:403}).mistakes).toHaveLength(1)
  expect(commitResponse(401,{status:200,challenge:false,media:'text',safe:false,early:false}).mistakes).toHaveLength(4)
})

it('matches method and path first, applies authority and exposes a shadowed rule', () => {
  const input={method:'GET',path:'/api/tasks/summary',grant:'TASK_READ',broadFirst:false} as const
  expect(matchRule(input)).toMatchObject({rule:'Summary GET',allowed:true})
  expect(matchRule({...input,grant:'TASK_CREATE'}).allowed).toBe(false)
  expect(matchRule({...input,method:'POST'})).toMatchObject({rule:'Task subtree deny',allowed:false})
  expect(matchRule({...input,broadFirst:true})).toMatchObject({rule:'Task subtree deny',allowed:false})
  expect(matchRule({...input,path:'/status'})).toMatchObject({rule:'Fallback deny',allowed:false})
})

it('hides the simulated response until prediction and clears it on changing cases', () => {
  const report=vi.fn()
  render(<RequestTriage report={report}/>)
  const run=screen.getByRole('button',{name:'Run triage request'})
  expect(run).toBeDisabled()
  expect(screen.getAllByLabelText('Illustrative HTTP message')).toHaveLength(1)
  const prediction=within(screen.getByRole('group',{name:'Predict the status'}))
  fireEvent.click(prediction.getByRole('button',{name:'403 Forbidden'}))
  fireEvent.click(run)
  expect(screen.getByRole('status')).toHaveTextContent('Prediction differed')
  expect(report).not.toHaveBeenCalledWith(true)
  fireEvent.click(screen.getByRole('button',{name:'Incorrect credentials'}))
  expect(run).toBeDisabled()
  expect(screen.getAllByLabelText('Illustrative HTTP message')).toHaveLength(1)
})
