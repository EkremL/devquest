import { useState } from 'react'
import { ArrowRight, Boxes, Cpu, Fingerprint, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabRecord, LabSelect, useTrials } from './TokenLifecycleLab'
import { cleanupContract, taskTrace, trustRecords, trustStates, type TrustState } from './contextModel'
import type { ReportActivity } from './missionIds'
import './identity-foundations.css'

type Props={report:ReportActivity}
const properties=['Principal','Credentials','Authorities'] as const
const reads={
  Principal:['getPrincipal()','"fixture-reviewer"','The configured authentication mechanism chooses the principal type.'],
  Credentials:['getCredentials()','null','This verified fixture has erased its credential material.'],
  Authorities:['getAuthorities()','[export:read]','This grant is input to policy. Stored resource scope is independent.'],
} as const

export function ContextCabinet({report}:Props) {
  const [field,setField]=useState<typeof properties[number]>(properties[0])
  const [opened,setOpened]=useState(false)
  const trials=useTrials(properties,report)
  const detail=reads[field]
  return <div className="mx-canvas tl-work ic-work" data-work="context-cabinet">
    <LabHeading label="Java object cabinet" title="Open the container and inspect the caller">
      Inspect the three fields on the fixture’s verified Authentication. The cabinet exposes fictional object state.
    </LabHeading>
    <div className="ic-cabinet">
      <div className="ic-object">
        <strong>SecurityContext</strong><span>getAuthentication()</span><ArrowRight size={16} aria-hidden="true"/>
        <strong>Authentication</strong>
        <div className="mx-switcher" role="group" aria-label="Authentication properties">{properties.map(item=>
          <button type="button" key={item} aria-pressed={opened&&field===item} onClick={()=>{setField(item);setOpened(true);trials.record(item)}}>{item}</button>)}</div>
      </div>
      <CodeSample language={opened?'java':'text'} wrap text={opened?detail[0]+'\n'+detail[1]:'Select an Authentication property.'} activeLine={opened?1:undefined}/>
    </div>
    <Feedback title={opened?detail[0]:'Awaiting field inspection'} tone={opened?'identity':'pending'}>
      {opened?detail[2]:'Follow the container to the accepted authentication result.'} {trials.count} / 3 fields inspected.
    </Feedback>
  </div>
}

export function ContextTrust({report}:Props) {
  const [state,setState]=useState<TrustState>(trustStates[0])
  const [checked,setChecked]=useState(false)
  const trials=useTrials(trustStates,report)
  const record=trustRecords[state]
  return <div className="mx-canvas tl-work ic-work" data-work="context-trust">
    <LabHeading label="Trust comparison" title="Separate the flag from the trust decision">
      Test all four objects against a rule requiring a verified identity. Compare the anonymous and verified flags.
    </LabHeading>
    <LabSelect label="Context authentication" value={state} options={trustStates} onChange={value=>{setState(value);setChecked(false);report()}}/>
    <LabRecord values={[['isAuthenticated()',record.flag],['Identity evidence',record.principal]]}/>
    <button type="button" className="primary-button" onClick={()=>{setChecked(true);trials.record(state)}}>Evaluate identity trust</button>
    <Feedback title={!checked?'Trust decision pending':record.accepted?'Verified caller accepted':'Verified identity required'} tone={!checked?'pending':record.accepted?'trusted':'rejected'}>
      {checked&&state==='Anonymous token'?'Anonymous has a true flag but represents unauthenticated trust.':'This fixture is anonymous-aware and assumes accepted tokens originate from trusted code.'} {trials.count} / 4 trust cases.
    </Feedback>
  </div>
}

const lifecycle=[
  ['Request entry','Resolve the request context from the configured repository.'],
  ['Verification succeeds','Associate a fresh context containing the verified result.'],
  ['Downstream reads context','Use the accepted result as input to policy.'],
  ['Request exits','The Servlet security boundary clears the holder.'],
] as const
const lifeCode=['repository.loadDeferredContext(request);','SecurityContextHolder.setContext(verifiedContext);','SecurityContextHolder.getContext().getAuthentication();','SecurityContextHolder.clearContext();'].join('\n')
export function ContextLifecycle({report}:Props) {
  const [step,setStep]=useState(-1)
  const unit=lifecycle[step]
  return <div className="mx-canvas tl-work ic-work" data-work="context-life">
    <LabHeading label="Request lifetime" title="Follow the context from entry to cleanup">
      Step through a synchronous Servlet request. The code shows separate API calls with the surrounding framework flow omitted.
    </LabHeading>
    <CodeSample language="java" wrap text={lifeCode} activeLine={step}/>
    <button type="button" className="primary-button" disabled={step===3} onClick={()=>{setStep(step+1);report(step===2)}}>Advance context lifecycle</button>
    <Feedback title={unit?.[0]??'Awaiting request entry'} tone={unit?'identity':'pending'}>
      {unit?.[1]??'Begin with the configured repository and follow the current request.'} A changed holder alone does not save its context to the repository.
    </Feedback>
  </div>
}

export function ContextThreads({report}:Props) {
  const [wrapped,setWrapped]=useState(false)
  const [throws,setThrows]=useState(false)
  const [result,setResult]=useState<ReturnType<typeof taskTrace>|null>(null)
  const trials=useTrials(['plain','scoped','exception'],report)
  function reset(){setResult(null);report()}
  return <div className="mx-canvas tl-work ic-work" data-work="context-threads">
    <LabHeading label="Thread lanes" title="Follow identity across a task boundary">
      Compare an ordinary pool job, a wrapped job and a wrapped job that throws. The worker starts empty in these fixtures.
    </LabHeading>
    <div className="tl-options">
      <label><input type="checkbox" checked={wrapped} onChange={event=>{setWrapped(event.target.checked);reset()}}/> Use explicit context wrapper</label>
      <label><input type="checkbox" checked={throws} onChange={event=>{setThrows(event.target.checked);reset()}}/> Task throws fixture exception</label>
    </div>
    <TechnicalPath label="Submitting thread and task lifecycle" nodes={[
      {id:'submit',label:'Submitting thread',value:'Verified caller',icon:Fingerprint,tone:'identity'},
      {id:'worker',label:'Worker during task',value:result?.during??'Awaiting task',icon:Cpu,tone:result?'identity':'quiet'},
      {id:'baseline',label:'Worker after task',value:result?.after??'Awaiting return',icon:ShieldCheck,tone:result?'trusted':'quiet'},
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(taskTrace(wrapped,throws));report()
      if(wrapped)trials.record(throws?'exception':'scoped')
      else if(!throws)trials.record('plain')
    }}>Run worker task</button>
    <Feedback title={result?.terminal??'Awaiting worker task'} tone={!result?'pending':throws?'rejected':'trusted'}>
      {trials.count} / 3 traces. The wrapper restores or clears the worker’s previous context even when its delegate fails.
    </Feedback>
  </div>
}

const policies=[{id:'flag',label:'Flag alone'},{id:'trust',label:'Anonymous-aware decision'}] as const
export function ContextRelease({report}:Props) {
  const [policy,setPolicy]=useState<'flag'|'trust'>('flag')
  const [scope,setScope]=useState(false)
  const [throwCheck,setThrowCheck]=useState(false)
  const [result,setResult]=useState('')
  function reset(){setResult('');report()}
  return <div className="mx-canvas tl-work ic-work" data-work="context-review">
    <LabHeading label="Cleanup release check" title="Review the worker’s identity contract">
      A report job needs the current verified caller only while it runs. The next task must see the original worker baseline even after failure.
    </LabHeading>
    <Switcher label="Identity rule" options={policies} value={policy} onChange={value=>{setPolicy(value);reset()}}/>
    <div className="tl-options">
      <label><input type="checkbox" checked={scope} onChange={event=>{setScope(event.target.checked);reset()}}/> Use a scoped propagation wrapper</label>
      <label><input type="checkbox" checked={throwCheck} onChange={event=>{setThrowCheck(event.target.checked);reset()}}/> Check the follow-up task after an exception</label>
    </div>
    <TechnicalPath label="Required release evidence" nodes={[
      {id:'identity',label:'Caller trust',value:policy==='trust'?'Anonymous excluded':'Flag only',icon:Fingerprint,tone:'identity'},
      {id:'scope',label:'Task context',value:scope?'Scoped to job':'Unverified scope',icon:Boxes,tone:'identity'},
      {id:'cleanup',label:'Worker baseline',value:throwCheck?'Exception case included':'Success case only',icon:Cpu,tone:'identity'},
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      const next=cleanupContract(policy==='trust',scope,throwCheck)
      setResult(next);report(next==='Context contract verified')
    }}>Verify context contract</button>
    <Feedback title={result||'Awaiting contract review'} tone={!result?'pending':result==='Context contract verified'?'trusted':'rejected'}>
      Verify both caller trust at entry and the original worker state on exit. The wrapper carries a context that trusted code already established.
    </Feedback>
  </div>
}
