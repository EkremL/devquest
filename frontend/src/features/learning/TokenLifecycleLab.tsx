import { useState, type ReactNode } from 'react'
import { ArrowRight, Database, KeyRound, Server, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import type { ReportActivity } from './missionIds'
import { delivery, expiry, refreshGrant, validateAccess, type Credential, type Endpoint, type Format, type Grant } from './tokenLifecycleModel'
import './token-labs.css'

type Props = { report: ReportActivity }
export function LabSelect<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly T[]; onChange: (value: T) => void
}) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value as T)}>
    {options.map(option => <option key={option}>{option}</option>)}</select></label>
}

export function useTrials(required: readonly string[], report: ReportActivity) {
  const [observed,setObserved] = useState<string[]>([])
  return { count: observed.length, record(value: string) {
    if (!required.includes(value)) return
    const next = observed.includes(value) ? observed : [...observed,value]
    setObserved(next);report(next.length===required.length)
  } }
}

export function LabRecord({ values }: { values: readonly (readonly [string,ReactNode])[] }) {
  return <dl className="tl-record">{values.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
}

export function TokenDispatch({ report }: Props) {
  const [credential,setCredential]=useState<Credential>('access')
  const [endpoint,setEndpoint]=useState<Endpoint>('resource')
  const [sent,setSent]=useState(false)
  const [issued,setIssued]=useState(false)
  const trials=useTrials(['access/resource','refresh/issuer','refresh/resource'],report)
  const route=endpoint==='resource'?'GET /dispatch/jobs':'POST /token'
  function invalidate(){setSent(false);report()}
  return <div className="mx-canvas tl-work" data-work="dispatch">
    <LabHeading label="Credential dispatch · local model" title="Send the credential to the right receiver">
      Issue a fictional pair. Trace an access credential to the API, then compare where a refresh credential is accepted and refused.
    </LabHeading>
    <div className="tl-controls">
      <button className="primary-button" type="button" disabled={issued} onClick={()=>{setIssued(true);invalidate()}}>Issue fictional pair</button>
      <LabSelect label="Credential" value={credential} options={['access','refresh','none']} onChange={value=>{setCredential(value);invalidate()}}/>
      <LabSelect label="Receiver" value={endpoint} options={['resource','issuer']} onChange={value=>{setEndpoint(value);invalidate()}}/>
      <button className="secondary-button" type="button" disabled={!issued} onClick={()=>{
        setSent(true);report();trials.record(credential+'/'+endpoint)
      }}>Trace delivery</button>
    </div>
    <TechnicalPath label="Token issuance and delivery" nodes={[
      {id:'issuer',label:'Issuer',value:issued?'Pair issued after approval':'Awaiting issuance',tone:issued?'trusted':'pending',icon:Server},
      {id:'inventory',label:'Client inventory',value:issued?'Access + refresh':'Empty',tone:'identity',icon:KeyRound},
      {id:'receiver',label:endpoint==='resource'?'Resource API':'Issuer token endpoint',value:sent?route:'Ready for delivery',tone:sent?'trusted':'quiet',icon:ShieldCheck},
    ]}/>
    <Feedback title={sent?delivery(credential,endpoint):'Ready to trace'} tone={sent&&(credential==='refresh'&&endpoint==='resource'||credential==='access'&&endpoint==='issuer')?'rejected':'identity'}>
      {sent ? 'The receiver checks credential purpose. Reaching it does not mean the caller has permission for a resource.' :
        'This fixture starts after the issuer approves the client and grant. The two handles have distinct recipients.'}
    </Feedback>
  </div>
}

const formats=[{id:'opaque',label:'Opaque handle'},{id:'self-contained',label:'Self-contained'}] as const
export function AccessClock({ report }: Props) {
  const [format,setFormat]=useState<Format>('opaque')
  const [minute,setMinute]=useState(0)
  const [result,setResult]=useState('')
  const trials=useTrials(['opaque/active','self-contained/active','expired'],report)
  function update(){setResult('');report()}
  return <div className="mx-canvas tl-work" data-work="clock">
    <LabHeading label="Verifier bench" title="Change the format, then cross the time boundary">
      Compare the two active access tokens. Check at minute 5 to observe the exact expiry boundary.
    </LabHeading>
    <Switcher label="Access token format" options={formats} value={format} onChange={value=>{setFormat(value);update()}}/>
    <LabRecord values={ [['Presentation',format==='opaque'?'Fictional reference':'Protected claims envelope'],
      ['Verifier input',format==='opaque'?'Trusted issuer result':'Locally validated claims'],['Clock policy','Expiry exclusive · no leeway in this fixture']] }/>
    <label className="tl-range">Resource clock <strong>{minute} min</strong>
      <input type="range" aria-label="Resource clock" min={0} max={7} value={minute} onChange={event=>{setMinute(Number(event.target.value));update()}}/>
    </label>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(validateAccess(format,minute,false,true));report()
      if(minute<expiry) trials.record(format+'/active')
      if(minute===expiry) trials.record('expired')
    }}>Check access evidence</button>
    <Feedback title={result||'Awaiting verification'} tone={!result?'pending':minute<expiry?'trusted':'rejected'}>
      {trials.count} / 3 comparisons. A validated token can identify a caller or client. The resource still evaluates the requested action.
    </Feedback>
  </div>
}

export function RevocationRoutes({ report }: Props) {
  const [format,setFormat]=useState<Format>('opaque')
  const [revoked,setRevoked]=useState(false)
  const [available,setAvailable]=useState(true)
  const [result,setResult]=useState('')
  const trials=useTrials(['inactive','offline','local'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work" data-work="boundary">
    <LabHeading label="Distributed revocation" title="Track who knows the grant was withdrawn">
      Compare revocation through online introspection and local-only validation. Then simulate issuer unavailability on the lookup path.
    </LabHeading>
    <Switcher label="Revocation validation path" options={formats} value={format} onChange={value=>{setFormat(value);clear()}}/>
    <div className="tl-controls">
      <label><input type="checkbox" checked={revoked} onChange={event=>{setRevoked(event.target.checked);clear()}}/> Grant revoked at issuer</label>
      <label><input type="checkbox" checked={available} onChange={event=>{setAvailable(event.target.checked);clear()}}/> Issuer reachable</label>
    </div>
    <div className="tl-network">
      <div><ShieldCheck size={24} aria-hidden="true"/> Resource verifier</div><ArrowRight size={20} aria-hidden="true"/>
      <div>{format==='opaque'?<Database size={24} aria-hidden="true"/>:<KeyRound size={24} aria-hidden="true"/>}
        {format==='opaque'?'Issuer introspection · '+(available?'reachable':'unavailable'):'Local evidence · no live revocation feed'}</div>
    </div>
    <button className="primary-button" type="button" onClick={()=>{
      const decision=validateAccess(format,1,revoked,available)
      setResult(decision);report()
      if(decision==='Introspection unavailable') trials.record('offline')
      if(decision==='Inactive at issuer') trials.record('inactive')
      if(revoked&&format==='self-contained') trials.record('local')
    }}>Run revocation probe</button>
    <Feedback title={result||'Awaiting probe'} tone={!result?'pending':result.startsWith('Accepted')?'trusted':'rejected'}>
      {trials.count} / 3 comparisons. Assume no cached introspection, no deny list and valid, unexpired local evidence. Hold protected data when a required lookup fails.
    </Feedback>
  </div>
}

const initialGrant: Grant={generation:1,revoked:false}
export function RefreshLedger({ report }: Props) {
  const [grant,setGrant]=useState(initialGrant)
  const [result,setResult]=useState('')
  const observations=useTrials(['rotated','retired'],report)
  function exchange(presented:number) {
    const next=refreshGrant(grant,presented)
    setGrant(next.grant);setResult(next.result);report()
    if(next.grant.generation>grant.generation) observations.record('rotated')
    if(!grant.revoked&&next.grant.revoked) observations.record('retired')
  }
  return <div className="mx-canvas tl-work" data-work="ledger">
    <LabHeading label="Refresh family ledger" title="Rotate the handle and inspect a retired one">
      Exchange the current handle once. Then run the issuer’s synthetic retired-handle regression probe to see this grant’s reuse policy.
    </LabHeading>
    <LabRecord values={ [['Current generation',grant.generation],['Previous handle',grant.generation===1?'None':'Retired'],
      ['Server grant state',grant.revoked?'Revoked · reauthorization required':'Active']] }/>
    <div className="tl-controls">
      <button className="primary-button" type="button" disabled={grant.revoked} onClick={()=>exchange(grant.generation)}>Exchange current handle</button>
      <button className="secondary-button" type="button" disabled={grant.generation===1||grant.revoked}
        onClick={()=>exchange(grant.generation-1)}>Check retired handle</button>
      <button className="secondary-button" type="button" onClick={()=>{setGrant(initialGrant);setResult('');report()}}>Reset grant</button>
    </div>
    <Feedback title={result||'Awaiting issuer operation'} tone={grant.revoked?'rejected':result?'trusted':'pending'}>
      Rotation retires the old refresh handle. This issuer closes the grant on known reuse. A locally accepted access credential has its own lifetime.
    </Feedback>
  </div>
}

export function TokenIncident({ report }: Props) {
  const [online,setOnline]=useState(false)
  const [closed,setClosed]=useState(false)
  const [rotate,setRotate]=useState(false)
  const [result,setResult]=useState<boolean|null>(null)
  function edit(){setResult(null);report()}
  return <div className="mx-canvas tl-work" data-work="incident">
    <LabHeading label="Launch gate" title="Meet the withdrawal guarantee">
      Dispatch must stop downloads immediately after grant withdrawal, and stop when its authority service is unavailable. Keep issuer refresh operations separate.
    </LabHeading>
    <CodeSample language="text" text="Resource target: /dispatch/jobs\nWithdrawal: immediate\nIssuer outage: protected data stays closed" wrap/>
    <div className="tl-options">
      <label><input type="checkbox" checked={online} onChange={event=>{setOnline(event.target.checked);edit()}}/> Require current issuer introspection</label>
      <label><input type="checkbox" checked={closed} onChange={event=>{setClosed(event.target.checked);edit()}}/> Withhold data when introspection fails</label>
      <label><input type="checkbox" checked={rotate} onChange={event=>{setRotate(event.target.checked);edit()}}/> Rotate refresh handles at the issuer</label>
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      const passes=online&&closed&&rotate;setResult(passes);report(passes)
    }}>Run launch gate</button>
    {result!==null && <Feedback title={result?'Dispatch contract satisfied':'A launch requirement is unmet'} tone={result?'trusted':'rejected'}>
      {result?'The API needs a current active decision. The issuer owns refresh rotation and the resource closes on uncertainty.':
        !online?'Local-only acceptance cannot guarantee immediate withdrawal.':!closed?'Do not serve a protected resource when the required decision is unavailable.':
        'Refresh evidence belongs to the issuer. Keep its retirement policy independent from API access.'}
    </Feedback>}
  </div>
}
