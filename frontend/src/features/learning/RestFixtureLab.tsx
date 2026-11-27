import { useState } from 'react'
import { Braces, Fingerprint, Network, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabSelect, useTrials } from './TokenLifecycleLab'
import { profileTrace, restContract, restResponse, restRoutes, type RestRoute } from './restFixtureModel'
import type { ReportActivity } from './missionIds'
import './rest-policy.css'

type Props={report:ReportActivity}
export function RestChain({report}:Props) {
  const [status,setStatus]=useState(false)
  const [profile,setProfile]=useState(false)
  const [checked,setChecked]=useState(false)
  const complete=status&&profile
  function clear(){setChecked(false);report()}
  const code=[
    'http.authorizeHttpRequests(routes -> routes',
    ...(status ? ['    .requestMatchers(GET, "/api/status").permitAll()'] : []),
    ...(profile ? ['    .requestMatchers(GET, "/api/profile").authenticated()'] : []),
    '    .anyRequest().denyAll())',
    '    .httpBasic(withDefaults()).build();',
  ].join('\n')
  return <div className="mx-canvas tl-work rp-work" data-work="rest-chain">
    <LabHeading label="Policy builder" title="Open exactly two routes with different rules">
      Start with a deny-by-default fixture. Add the public status rule and the authenticated profile rule to satisfy the release contract.
    </LabHeading>
    <div className="rp-builder">
      <div className="tl-options">
        <label><input type="checkbox" checked={status} onChange={event=>{setStatus(event.target.checked);clear()}}/> Permit GET /api/status</label>
        <label><input type="checkbox" checked={profile} onChange={event=>{setProfile(event.target.checked);clear()}}/> Require identity for GET /api/profile</label>
      </div>
      <CodeSample language="java" wrap text={code}/>
    </div>
    <button type="button" className="primary-button" onClick={()=>{setChecked(true);report(complete)}}>Check route contract</button>
    <Feedback title={!checked?'Awaiting route check':complete?'Route contract ready':'Route contract incomplete'} tone={!checked?'pending':complete?'trusted':'rejected'}>
      {checked&&!complete?'The unmatched route uses denyAll. Keep the fallback while adding both explicit GET rules.':'The fixture leaves Basic and the deny-all fallback in the same filter chain.'}
    </Feedback>
  </div>
}

const evidenceOptions=[{id:'none',label:'No evidence'},{id:'verified',label:'Accepted Basic fixture'}] as const
export function RestExchanges({report}:Props) {
  const [route,setRoute]=useState<RestRoute>(restRoutes[0])
  const [evidence,setEvidence]=useState<'none'|'verified'>('none')
  const [result,setResult]=useState<ReturnType<typeof restResponse>|null>(null)
  const trials=useTrials(['public','challenge','verified'],report)
  function clear(){setResult(null);report()}
  const statuses:Record<number,string>={200:'200 OK',401:'401 Unauthorized',403:'403 Forbidden'}
  return <div className="mx-canvas tl-work rp-work" data-work="rest-exchanges">
    <LabHeading label="Local HTTP console" title="Compare the requests without sending a network call">
      Run public GET with no evidence and protected GET both with and without accepted fixture evidence.
    </LabHeading>
    <div className="tl-controls"><LabSelect label="API route" value={route} options={restRoutes} onChange={value=>{setRoute(value);clear()}}/>
      <Switcher label="Evidence" options={evidenceOptions} value={evidence} onChange={value=>{setEvidence(value);clear()}}/></div>
    <div className="rp-exchanges">
      <CodeSample language="http" wrap text={'GET '+route+' HTTP/1.1'+(evidence==='verified'?'\nAuthorization: Basic [fixture redacted]':'')}/>
      {result&&<CodeSample language="http" wrap text={'HTTP/1.1 '+statuses[result.status]+(result.challenge?'\nWWW-Authenticate: Basic realm="fixture"':'')+(result.body?'\n\n'+result.body:'')}/>}
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(restResponse(route,evidence==='verified'));report()
      if(route==='/api/status'&&evidence==='none')trials.record('public')
      if(route==='/api/profile')trials.record(evidence==='none'?'challenge':'verified')
    }}>Run simulated request</button>
    <Feedback title={result?statuses[result.status]:'Awaiting simulated request'} tone={!result?'pending':result.status===200?'trusted':'rejected'}>
      {result?'Controller · '+result.controller+'. ':'The fixture handles normal GET requests only. '}{trials.count} / 3 exchanges compared.
    </Feedback>
  </div>
}

const details={
  Name:['getName()', '"fixture-reader"','The name comes from the established Authentication.'],
  Authorities:['getAuthorities()', '[profile:read]','Grants are available to server policy. This response does not need to expose them.'],
  'Response projection':['return Map.of("name", caller.getName());','{ "name": "fixture-reader" }','Return only what the client needs. Credential material stays outside the response.'],
} as const
const detailKeys=['Name','Authorities','Response projection'] as const
export function RestCaller({report}:Props) {
  const [field,setField]=useState<typeof detailKeys[number]|null>(null)
  const selected=field&&details[field]
  const trials=useTrials(detailKeys,report)
  return <div className="mx-canvas tl-work rp-work" data-work="rest-caller">
    <LabHeading label="Controller projection" title="Compare the authenticated object with the API response">
      Inspect the accepted fixture’s name and authorities, then check which field leaves the server.
    </LabHeading>
    <div className="rp-builder">
      <div className="rp-inspection"><Fingerprint size={20} aria-hidden="true"/><strong>Accepted Authentication</strong>
        <div className="mx-switcher" role="group" aria-label="Caller fields">{detailKeys.map(key=><button type="button" key={key} aria-pressed={key===field}
          onClick={()=>{setField(key);trials.record(key)}}>{key}</button>)}</div></div>
      <CodeSample language="java" wrap text={selected?selected[0]+'\n'+selected[1]:'// Select a field or inspect the projection'} activeLine={selected?1:undefined}/>
    </div>
    <Feedback title={field??'Waiting for inspection'} tone={field?'identity':'pending'}>{selected?selected[2]:'The controller uses the framework-provided caller.'} {trials.count} / 3 observations.</Feedback>
  </div>
}

const traceOptions=[{id:'anonymous',label:'Anonymous profile'},{id:'accepted',label:'Accepted profile'}] as const
export function RestTrace({report}:Props) {
  const [mode,setMode]=useState<'anonymous'|'accepted'>('anonymous')
  const [step,setStep]=useState(-1)
  const trials=useTrials(traceOptions.map(option=>option.id),report)
  const last=step===3
  const entries=profileTrace[mode]
  const outline=[['Filter chain',Network],['Basic authentication',Fingerprint],['Route authorization',ShieldCheck],['Response boundary',Braces]] as const
  return <div className="mx-canvas tl-work rp-work" data-work="rest-trace">
    <LabHeading label="Execution trace" title="Find where the profile request ends">
      Trace an anonymous request and an accepted fixture. Compare the last stage in each path.
    </LabHeading>
    <Switcher label="Profile request" options={traceOptions} value={mode} onChange={value=>{setMode(value);setStep(-1);report()}}/>
    <TechnicalPath label="Profile execution" nodes={outline.map(([label,icon],i)=>({
      id:label,label,icon,value:i<=step?entries[i]:'Waiting',
      tone:i===step?last&&mode==='anonymous'?'rejected':'identity':i<step?'trusted':'quiet',
    }))}/>
    <button type="button" className="primary-button" disabled={last} onClick={()=>{setStep(step+1);report();if(step===2)trials.record(mode)}}>Advance profile request</button>
    <Feedback title={entries[step]??'Waiting for profile trace'} tone={step<0?'pending':last&&mode==='anonymous'?'rejected':'identity'}>
      {mode==='anonymous'?'A missing header does not start a password check.':'Accepted evidence supplies a context for the configured route rule.'} {trials.count} / 2 paths compared.
    </Feedback>
  </div>
}

const releaseCases=[
  {key:'public',label:'Public status',route:'/api/status',verified:false,expected:200},
  {key:'challenge',label:'Anonymous profile',route:'/api/profile',verified:false,expected:401},
  {key:'principal',label:'Authenticated profile',route:'/api/profile',verified:true,expected:200},
  {key:'fallback',label:'Unlisted route with verified identity',route:'/api/unlisted',verified:true,expected:403},
] as const
export function RestRelease({report}:Props) {
  const [observed,setObserved]=useState<string[]>([])
  const [result,setResult]=useState('')
  return <div className="mx-canvas tl-work rp-work" data-work="rest-release">
    <LabHeading label="Release checks" title="Prove the policy before shipping the API">
      Run all four contract probes. Verify that the protected and unlisted paths have different reasons for stopping.
    </LabHeading>
    <ol className="rp-cases">{releaseCases.map(test=><li key={test.key}><button type="button" className="secondary-button"
      onClick={()=>{
        const outcome=restResponse(test.route,test.verified)
        setResult('');report()
        if(outcome.status===test.expected&&outcome.challenge===(test.key==='challenge')&&
          (test.key!=='principal'||outcome.body.includes('fixture-reader'))){
          setObserved(current=>current.includes(test.key)?current:[...current,test.key])
        }
      }}>{test.label}</button><span>{observed.includes(test.key)?test.expected+' · verified':'Awaiting probe'}</span></li>)}</ol>
    <button type="button" className="primary-button" onClick={()=>{
      const next=restContract(observed)
      setResult(next);report(next==='REST release contract verified')
    }}>Approve REST contract</button>
    <Feedback title={result||'Awaiting release verdict'} tone={!result?'pending':result==='REST release contract verified'?'trusted':'rejected'}>
      The 401 checks authentication. The authenticated 403 checks the deny-all fallback. Only named routes should reach the controller.
    </Feedback>
  </div>
}
