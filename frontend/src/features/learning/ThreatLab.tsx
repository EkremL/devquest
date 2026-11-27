import { useState } from 'react'
import { Activity, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Feedback, LabHeading, TechnicalPath } from './MissionPrimitives'
import { LabRecord, LabSelect, useTrials } from './TokenLifecycleLab'
import type { ReportActivity } from './missionIds'
import { completion, containment, incidentSignals, transition } from './threatModel'
import './authentication-batch.css'

type Props = {report:ReportActivity}
const findings=['Focused guessing suspected','Credential reuse suspected','Exposure confirmed'] as const

export function SignalTriage({report}: Props) {
  const [event,setEvent]=useState(0)
  const [finding,setFinding]=useState<typeof findings[number]>(findings[0])
  const [result,setResult]=useState<boolean|null>(null)
  const trials=useTrials(incidentSignals.map(signal=>signal.name),report)
  const signal=incidentSignals[event]
  return <div className="mx-canvas tl-work auth-work" data-work="threat-signals">
    <LabHeading label="Incident console" title="Classify the evidence before choosing containment">
      Inspect three fictional records. Decide which pattern each one supports. Treat suspected guessing or reuse differently from confirmed exposure.
    </LabHeading>
    <div className="threat-desk">
      <div className="threat-tabs" role="group" aria-label="Incident record">
        {incidentSignals.map(({name},i)=><button type="button" key={name} aria-pressed={i===event} onClick={()=>{setEvent(i);setResult(null);report()}}>
          <Activity size={17} aria-hidden="true"/>{name}
        </button>)}
      </div>
      <ol className="threat-tape" aria-label="Redacted evidence in time order">
        {signal.tape.map(entry=><li key={entry}>{entry}</li>)}
      </ol>
    </div>
    <div className="tl-controls">
      <LabSelect label="Evidence classification" value={finding} options={findings} onChange={value=>{setFinding(value);setResult(null);report()}}/>
      <button type="button" className="primary-button" onClick={()=>{
        const matches=finding===signal.finding;setResult(matches);report()
        if(matches)trials.record(signal.name)
      }}>Record finding</button>
    </div>
    <Feedback title={result===null?'Awaiting classification':result?'Finding supported':'Reassess the evidence'} tone={result===null?'pending':result?'trusted':'rejected'}>
      {result===null?'A pattern gives you a hypothesis. Confirmed exposure is a separate fact.':signal.action} {trials.count} / 3 records classified.
    </Feedback>
  </div>
}

export function SessionBoundary({report}: Props) {
  const [stage,setStage]=useState(0)
  const [inspected,setInspected]=useState(false)
  const trials=useTrials(transition.map(row=>row.name),report)
  const row=transition[stage]
  return <div className="mx-canvas tl-work auth-work" data-work="threat-session">
    <LabHeading label="Session lifecycle" title="Verify the boundary from sign-in to logout">
      Step through the corrected lifecycle. Inspect the prior reference at each stop and confirm what the current reference can establish.
    </LabHeading>
    <TechnicalPath label="Corrected session lifecycle" nodes={transition.map((step,i)=>({
      id:step.name,label:step.name,value:step.reference,icon:i===1?ShieldCheck:KeyRound,tone:i===stage?'identity':i<stage?'trusted':'quiet'
    }))} selected={row.name} onSelect={name=>{setStage(transition.findIndex(step=>step.name===name));setInspected(false);report()}}/>
    <button type="button" className="primary-button" onClick={()=>{setInspected(true);trials.record(row.name)}}>Inspect reference state</button>
    <Feedback title={inspected?row.prior:'Awaiting reference inspection'} tone={inspected?'identity':'pending'}>
      {inspected?row.current:'Identifiers represent server-side state. No real session is issued here.'} {trials.count} / 3 boundary checks.
    </Feedback>
  </div>
}

const publicOptions=['Account-specific responses','Consistent failure response'] as const
const eventOptions=['Full authentication payload','Allowlisted event metadata'] as const
export function ObservabilityAudit({report}: Props) {
  const [publicOutput,setPublicOutput]=useState<typeof publicOptions[number]>(publicOptions[0])
  const [internal,setInternal]=useState<typeof eventOptions[number]>(eventOptions[0])
  const [review,setReview]=useState(false)
  const generic=publicOutput===publicOptions[1]
  const safe=internal===eventOptions[1]
  return <div className="mx-canvas tl-work auth-work" data-work="threat-outputs">
    <LabHeading label="Output boundaries" title="Keep public and private evidence separate">
      Repair a synthetic login failure contract. Compare the observable responses for unknown account and wrong evidence, then check what telemetry retains.
    </LabHeading>
    <div className="auth-audit">
      <div>
        <LabSelect label="Public response" value={publicOutput} options={publicOptions} onChange={value=>{setPublicOutput(value);setReview(false);report()}}/>
        {review&&<LabRecord values={[[ 'Unknown account',generic?'401 · Sign-in failed':'Account-specific outcome'],['Wrong evidence',generic?'401 · Sign-in failed':'Different public outcome']]}/>}
      </div>
      <div>
        <LabSelect label="Private log fields" value={internal} options={eventOptions} onChange={value=>{setInternal(value);setReview(false);report()}}/>
        {review&&<LabRecord values={[[ 'Event ID','auth-failure-42' ],['Credential content',safe?'Excluded by allowlist':'Sensitive fields present · values omitted']]}/>}
      </div>
    </div>
    <button type="button" className="primary-button" onClick={()=>{setReview(true);report(generic&&safe)}}>Audit outputs</button>
    <Feedback title={review?(generic&&safe?'Output contract satisfied':'Output contract leaks information'):'Awaiting output audit'} tone={!review?'pending':generic&&safe?'trusted':'rejected'}>
      This fixture compares the response label and log fields. Test timing, redirects, proxies and telemetry separately in a deployment.
    </Feedback>
  </div>
}

export function ContainmentProbe({report}: Props) {
  const [minute,setMinute]=useState(0)
  const [revoked,setRevoked]=useState(false)
  const [lookup,setLookup]=useState(false)
  const [reachable,setReachable]=useState(true)
  const [decision,setDecision]=useState('')
  const trials=useTrials(['local','revoked','outage','expiry'],report)
  function clear(){setDecision('');report()}
  return <div className="mx-canvas tl-work auth-work" data-work="threat-containment">
    <LabHeading label="Containment probe" title="Measure how long protected access can survive withdrawal">
      Compare time-only eligibility with live withdrawal, authority outage and minute 5. Other verification checks already passed in this fixture.
    </LabHeading>
    <label className="tl-range">Incident clock <strong>{minute} min</strong>
      <input type="range" min={0} max={5} value={minute} aria-label="Incident clock" onChange={event=>{setMinute(Number(event.target.value));clear()}}/>
    </label>
    <div className="tl-options">
      <label><input type="checkbox" checked={revoked} onChange={event=>{setRevoked(event.target.checked);clear()}}/> Authority withdrew grant</label>
      <label><input type="checkbox" checked={lookup} onChange={event=>{setLookup(event.target.checked);clear()}}/> Require current withdrawal check</label>
      <label><input type="checkbox" checked={reachable} onChange={event=>{setReachable(event.target.checked);clear()}}/> Authority reachable</label>
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      const result=containment(minute,revoked,lookup,reachable)
      setDecision(result);report()
      if(result==='Eligible on time alone'&&revoked)trials.record('local')
      if(result==='Withdrawal observed')trials.record('revoked')
      if(result==='Protected response withheld')trials.record('outage')
      if(result==='Expired evidence')trials.record('expiry')
    }}>Check containment</button>
    <Feedback title={decision||'Awaiting containment probe'} tone={!decision?'pending':decision==='Eligible on time alone'?'identity':decision==='Current evidence verified'?'trusted':'rejected'}>
      {trials.count} / 4 comparisons. A current-state requirement and a time boundary cover different risks.
    </Feedback>
  </div>
}

const factors=['Pending','Rejected','Verified'] as const
export function AuthIncident({report}: Props) {
  const [factor,setFactor]=useState<typeof factors[number]>('Pending')
  const [session,setSession]=useState(true)
  const [result,setResult]=useState('')
  const trials=useTrials(['Pending','Rejected','Verified','invalidated'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work auth-work" data-work="threat-final">
    <LabHeading label="Release verification" title="Run the corrected login contract before reopening">
      The password step already succeeded. Confirm that pending and rejected second factors establish no principal. Then verify full success and the invalidated-session boundary.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Second factor" value={factor} options={factors} onChange={value=>{setFactor(value);clear()}}/>
      <label><input type="checkbox" checked={session} onChange={event=>{setSession(event.target.checked);clear()}}/> Session record current</label>
    </div>
    <TechnicalPath label="Evidence and session gates" nodes={[
      {id:'factor',label:'Required factor',value:factor,icon:KeyRound,tone:factor==='Verified'?'trusted':'pending'},
      {id:'session',label:'Serving state',value:session?'Current record':'Invalidated',icon:LockKeyhole,tone:session?'identity':'rejected'},
      {id:'decision',label:'Authentication result',value:result||'Awaiting check',icon:ShieldCheck,tone:!result?'quiet':result.startsWith('Verified')?'trusted':'rejected'},
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(completion(factor,session));trials.record(factor==='Verified'&&!session?'invalidated':factor)
    }}>Verify login gate</button>
    <Feedback title={result||'Awaiting release check'} tone={!result?'pending':result.startsWith('Verified')?'trusted':'identity'}>
      {trials.count} / 4 release checks. A verified principal still needs permission for the protected route.
    </Feedback>
  </div>
}
