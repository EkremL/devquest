import { useState } from 'react'
import { Database, Fingerprint, KeyRound, Network } from 'lucide-react'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabRecord, LabSelect, useTrials } from './TokenLifecycleLab'
import { mechanisms, paths, storage, withdrawal, type Mechanism } from './mechanismModel'
import type { ReportActivity } from './missionIds'
import './authentication-batch.css'

type Props = {report:ReportActivity}
const callers = [{id:'portal',label:'Employee portal'},{id:'worker',label:'Managed worker'}] as const

export function MechanismRoute({report}: Props) {
  const [caller,setCaller]=useState<'portal'|'worker'>('portal')
  const [mechanism,setMechanism]=useState<Mechanism>('API key')
  const [result,setResult]=useState<boolean|null>(null)
  const trials=useTrials(['portal','worker'],report)
  const route=paths[mechanism]
  const portal=caller==='portal'
  return <div className="mx-canvas tl-work auth-work" data-work="mechanism-route">
    <LabHeading label="Evidence router" title="Connect each caller to its verifier">
      The employee portal requires a browser session and immediate logout. The managed worker has a private key and requires possession proof at the gateway.
    </LabHeading>
    <Switcher label="Caller" options={callers} value={caller} onChange={value=>{setCaller(value);setResult(null);report()}}/>
    <div className="tl-controls">
      <LabSelect label="Mechanism" value={mechanism} options={mechanisms} onChange={value=>{setMechanism(value);setResult(null);report()}}/>
      <button type="button" className="primary-button" onClick={()=>{
        const matches=mechanism===(portal?'Server session':'Mutual TLS')
        setResult(matches);report()
        if(matches)trials.record(caller)
      }}>Route the request</button>
    </div>
    <TechnicalPath label="Caller, evidence and verifier" nodes={[
      {id:'caller',label:'Caller',value:portal?'Employee browser':'Managed workload',icon:Network,tone:'identity'},
      {id:'evidence',label:'Presented evidence',value:route.evidence,icon:KeyRound,tone:'identity'},
      {id:'verifier',label:'Verification boundary',value:route.verifier,icon:Fingerprint,tone:result===null?'pending':result?'trusted':'rejected',boundary:true},
    ]}/>
    <Feedback title={result===null?'Route awaiting review':result?'Caller contract satisfied':'Caller contract unmet'} tone={result===null?'pending':result?'trusted':'rejected'}>
      {result===null?'Compare the caller’s storage options with the required proof.':portal
        ? 'The portal needs a cookie reference to current server state. A machine credential cannot establish this employee session.'
        : 'The gateway requires certificate possession proof. A bearer credential alone does not supply it.'} {trials.count} / 2 routes accepted.
    </Feedback>
  </div>
}
const tokenFormats=['Opaque token','JWT access token'] as const
export function WithdrawalBench({report}: Props) {
  const [format,setFormat]=useState<typeof tokenFormats[number]>('Opaque token')
  const [revoked,setRevoked]=useState(false)
  const [reachable,setReachable]=useState(true)
  const [minute,setMinute]=useState(0)
  const [outcome,setOutcome]=useState('')
  const trials=useTrials(['revoked','local','outage','expired'],report)
  function clear(){setOutcome('');report()}
  return <div className="mx-canvas tl-work auth-work" data-work="mechanism-withdrawal">
    <LabHeading label="Revocation timeline" title="Watch the same withdrawal reach different verifiers">
      Revoke the grant and test both verification paths before minute 5. Then isolate a lookup outage and check the exact expiry boundary.
    </LabHeading>
    <LabSelect label="Token path" value={format} options={tokenFormats} onChange={value=>{setFormat(value);clear()}}/>
    <div className="auth-time"><span>0 · issued</span><span>5 · expired</span></div>
    <label className="tl-range">Request minute <strong>{minute}</strong>
      <input type="range" aria-label="Request minute" min={0} max={5} value={minute} onChange={event=>{setMinute(Number(event.target.value));clear()}}/>
    </label>
    <div className="tl-options">
      <label><input type="checkbox" checked={revoked} onChange={event=>{setRevoked(event.target.checked);clear()}}/> Grant withdrawn</label>
      <label><input type="checkbox" checked={reachable} onChange={event=>{setReachable(event.target.checked);clear()}}/> Authority reachable</label>
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      const next=withdrawal(format,revoked,reachable,minute)
      setOutcome(next);report()
      if(next==='Withdrawn at current lookup')trials.record('revoked')
      if(next==='Locally eligible'&&revoked)trials.record('local')
      if(next==='Required authority unavailable')trials.record('outage')
      if(next==='Lifetime ended')trials.record('expired')
    }}>Evaluate withdrawal</button>
    <Feedback title={outcome||'Awaiting request'} tone={!outcome?'pending':outcome.includes('eligible')||outcome.startsWith('Eligible')?'trusted':'rejected'}>
      {trials.count} / 4 observations. This fixture assumes known lifetime, no introspection caching and already-trusted local JWT keys.
    </Feedback>
  </div>
}

export function StatePlacement({report}:Props) {
  const [mechanism,setMechanism]=useState<Mechanism>('Server session')
  const [available,setAvailable]=useState(true)
  const [checked,setChecked]=useState(false)
  const trials=useTrials(['jwt-serving','opaque-blocked'],report)
  const route=paths[mechanism]
  const needsProvider=mechanism==='Opaque token'
  return <div className="mx-canvas tl-work auth-work" data-work="mechanism-state">
    <LabHeading label="Dependency graph" title="Separate issuance from protected requests">
      Take the identity platform offline. Compare established JWT and opaque requests with a fresh OAuth token request. The session store is separate and remains healthy.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Serving mechanism" value={mechanism} options={mechanisms.slice(0,3)} onChange={value=>{setMechanism(value);setChecked(false);report()}}/>
      <label><input type="checkbox" checked={available} onChange={event=>{setAvailable(event.target.checked);setChecked(false);report()}}/> Identity platform online</label>
    </div>
    <div className="auth-lanes">
      <div><Network size={20} aria-hidden="true"/><strong>Client → identity platform</strong><span>{checked?(available?'Fresh OAuth issuance available':'Fresh OAuth issuance unavailable'):'Fresh OAuth issuance awaiting probe'}</span></div>
      <div><Database size={20} aria-hidden="true"/><strong>API → {route.dependency}</strong><span>{checked?(!available&&needsProvider?'Existing request held':'Existing request can continue'):'Established request awaiting probe'}</span></div>
    </div>
    <LabRecord values={[[ 'Remote decision reads per protected request',route.visits ],['Fixture dependency',route.dependency]]}/>
    <button type="button" className="primary-button" onClick={()=>{
      setChecked(true);report()
      if(!available) {
        if(mechanism==='JWT access token') trials.record('jwt-serving')
        if(needsProvider) trials.record('opaque-blocked')
      }
    }}>Check both paths</button>
    <Feedback title={checked?'Dependency paths evaluated':'Awaiting dependency probe'} tone={checked?'identity':'pending'}>
      {trials.count} / 2 outage comparisons. Cached trusted keys are available in the JWT fixture. Issuer key refresh and login availability are separate concerns.
    </Feedback>
  </div>
}

export function StorageAudit({report}: Props) {
  const [targets,setTargets]=useState<string[]>(storage.map(row=>row.choices[0]))
  const [review,setReview]=useState(false)
  const matches=storage.map((row,i)=>row.expected===targets[i])
  return <div className="mx-canvas tl-work auth-work" data-work="mechanism-storage">
    <LabHeading label="Storage audit" title="Put each credential where it belongs">
      Assign the session reference, integration secret and TLS private key to their approved locations.
    </LabHeading>
    <div className="auth-audit">{storage.map((row,i)=><div key={row.item}>
      <LabSelect<string> label={row.item} value={targets[i]} options={row.choices} onChange={value=>{setTargets(targets.map((target,j)=>i===j?value:target));setReview(false);report()}}/>
      {review&&<p>{matches[i]?'Approved.':'Repair required.'} {row.note}</p>}
    </div>)}</div>
    <button type="button" className="primary-button" onClick={()=>{setReview(true);report(matches.every(Boolean))}}>Audit storage</button>
    <Feedback title={review?(matches.every(Boolean)?'Storage approved':'Storage needs repair'):'Awaiting storage review'} tone={!review?'pending':matches.every(Boolean)?'trusted':'rejected'}>
      Keep credential contents out of logs and public client assets.
    </Feedback>
  </div>
}

export function MechanismReview({report}: Props) {
  const [portal,setPortal]=useState<Mechanism>('JWT access token')
  const [worker,setWorker]=useState<Mechanism>('API key')
  const [closed,setClosed]=useState(false)
  const [result,setResult]=useState('')
  return <div className="mx-canvas tl-work auth-work" data-work="mechanism-review">
    <LabHeading label="Migration decision" title="Preserve both clients’ guarantees during cutover">
      Staff must lose access at the next portal request after logout. The worker needs certificate possession proof. The API must withhold protected data if required verification is unavailable.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Portal mechanism" value={portal} options={mechanisms} onChange={value=>{setPortal(value);setResult('');report()}}/>
      <LabSelect label="Worker mechanism" value={worker} options={mechanisms} onChange={value=>{setWorker(value);setResult('');report()}}/>
    </div>
    <div className="tl-options"><label><input type="checkbox" checked={closed} onChange={event=>{setClosed(event.target.checked);setResult('');report()}}/> Withhold data when verification is unavailable</label></div>
    <button type="button" className="primary-button" onClick={()=>{
      const next=portal!=='Server session'?'Portal needs immediate server-side invalidation':worker!=='Mutual TLS'?'Worker needs certificate possession proof':!closed?'Required verification must fail closed':'Migration contract satisfied'
      setResult(next);report(next==='Migration contract satisfied')
    }}>Review migration</button>
    <Feedback title={result||'Awaiting migration review'} tone={!result?'pending':result==='Migration contract satisfied'?'trusted':'rejected'}>
      Review browser and workload flows as separate trust boundaries. The application must still authorize each verified caller.
    </Feedback>
  </div>
}
