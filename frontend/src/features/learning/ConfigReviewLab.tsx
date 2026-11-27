import { useState } from 'react'
import { ArrowRight, Cookie, Fingerprint, Network } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabSelect, useTrials } from './TokenLifecycleLab'
import { browserGate, configContract, inventoryPaths, restoredIdentity, reviewedRule, type InventoryPath } from './configReviewModel'
import './rest-policy.css'
import type { ReportActivity } from './missionIds'

type Props={report:ReportActivity}
const exactRule={line:'    .requestMatchers(GET, "/api/status").permitAll()',label:'Exact public GET'}
const apiRule={line:'    .requestMatchers("/api/**").denyAll()',label:'Closed API guard'}
export function RuleStack({report}:Props) {
  const [exactFirst,setExactFirst]=useState(false)
  const [checked,setChecked]=useState(false)
  const trials=useTrials(['shadowed','corrected'],report)
  const rules=exactFirst?[exactRule,apiRule]:[apiRule,exactRule]
  const result=reviewedRule(inventoryPaths[0],exactFirst)
  return <div className="mx-canvas tl-work rp-work cf-work" data-work="config-order">
    <LabHeading label="Configuration diff" title="Move the public exception ahead of the closed guard">
      Audit GET /api/status in two rule orders. The broad rule denies API requests in this fixture, so the public exception can be shadowed without exposing protected data.
    </LabHeading>
    <div className="rp-builder"><div className="cf-rule-stack">
      {rules.map((rule,index)=><div key={rule.label} data-selected={checked&&index===0}>
        <strong>{index+1}. {rule.label}</strong><span>{!checked?'Waiting':index===0?'First match':'Skipped'}</span></div>)}
      <button type="button" className="secondary-button" onClick={()=>{setExactFirst(!exactFirst);setChecked(false);report()}}>Swap rule order</button>
    </div>
    <CodeSample language="java" wrap activeLine={checked?1:undefined}
      text={['http.authorizeHttpRequests(routes -> routes',...rules.map(rule=>rule.line),'    .anyRequest().denyAll());'].join('\n')}/></div>
    <button type="button" className="primary-button" onClick={()=>{setChecked(true);trials.record(exactFirst?'corrected':'shadowed')}}>Audit first match</button>
    <Feedback title={checked?result:'Awaiting rule audit'} tone={!checked?'pending':exactFirst?'trusted':'rejected'}>
      {checked?(exactFirst?'The exact public GET rule takes precedence.':'The API guard matches first, so the public exception is never considered.'):'The selected chain already owns this request.'}
      {' '}{trials.count} / 2 rule orders checked.
    </Feedback>
  </div>
}

export function RouteInventory({report}:Props) {
  const [route,setRoute]=useState<InventoryPath>(inventoryPaths[0])
  const [checked,setChecked]=useState(false)
  const trials=useTrials(inventoryPaths,report)
  return <div className="mx-canvas tl-work rp-work cf-work" data-work="config-inventory">
    <LabHeading label="Route inventory" title="Prove what the public exception covers">
      Probe the exact GET, a different method, a deeper path and a route outside the API prefix. This worksheet checks authorization rules in isolation.
    </LabHeading>
    <div className="tl-controls"><LabSelect label="Inventory request" value={route} options={inventoryPaths} onChange={value=>{setRoute(value);setChecked(false);report()}}/>
      <button type="button" className="primary-button" onClick={()=>{setChecked(true);trials.record(route)}}>Probe inventory rule</button></div>
    <dl className="cf-inventory"><dt>Route exception</dt><dd>GET /api/status</dd><dt>API guard</dt><dd>/api/** · deny</dd><dt>Fallback</dt><dd>anyRequest · deny</dd></dl>
    <Feedback title={checked?reviewedRule(route,true):'Awaiting route probe'} tone={!checked?'pending':route===inventoryPaths[0]?'trusted':'identity'}>
      {trials.count} / 4 boundaries probed. These outcomes describe authorization matchers. In a deployed chain other filters can stop the request sooner.
    </Feedback>
  </div>
}

const policies=[{id:'stateless',label:'Stateless context'},{id:'session',label:'Session-backed context'}] as const
export function SessionContinuity({report}:Props) {
  const [mode,setMode]=useState<'stateless'|'session'>('stateless')
  const [saved,setSaved]=useState(false)
  const [result,setResult]=useState('')
  const trials=useTrials(['stateless','saved','unsaved'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work rp-work cf-work" data-work="config-session">
    <LabHeading label="Request boundary" title="Start a second request and inspect its identity">
      The first request verified a fictional caller. The second has no new credentials. Compare stateless policy with session-backed context both saved and unsaved.
    </LabHeading>
    <Switcher label="Security context policy" options={policies} value={mode} onChange={value=>{setMode(value);clear()}}/>
    <div className="tl-options"><label><input type="checkbox" checked={saved} onChange={event=>{setSaved(event.target.checked);clear()}}/> A stored context is available with the session</label></div>
    <TechnicalPath label="Two request boundaries" nodes={[
      {id:'request-one',label:'Request one',value:'Verified context',icon:Fingerprint,tone:'identity'},
      {id:'repository',label:'Context lookup',value:mode==='stateless'?'Session not used for context':saved?'Saved context available':'No saved context',icon:Cookie,tone:'identity'},
      {id:'request-two',label:'Request two',value:result||'Awaiting request',icon:Network,tone:result?'identity':'quiet'},
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(restoredIdentity(mode==='session',saved));trials.record(mode==='session'?saved?'saved':'unsaved':'stateless')
    }}>Start second request</button>
    <Feedback title={result||'Awaiting second request'} tone={!result?'pending':result==='Saved context restored'?'trusted':'identity'}>
      {trials.count} / 3 context cases. The fixture assumes the same valid session cookie for the session-backed resume and no other authentication mechanism.
    </Feedback>
  </div>
}

const exchanges=[{id:'preflight',label:'CORS preflight'},{id:'actual',label:'Actual POST'}] as const
export function BrowserGates({report}:Props) {
  const [phase,setPhase]=useState<'preflight'|'actual'>('preflight')
  const [origin,setOrigin]=useState(true)
  const [csrf,setCsrf]=useState(false)
  const [result,setResult]=useState('')
  const trials=useTrials(['origin','preflight','csrf','accepted'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work rp-work cf-work" data-work="config-browser">
    <LabHeading label="Browser exchange" title="Pass preflight, then verify the actual request">
      Compare preflight from allowed and disallowed origins. Run the allowed-origin POST with verified fixture identity, both without and with valid CSRF evidence.
    </LabHeading>
    <Switcher label="Request phase" options={exchanges} value={phase} onChange={value=>{setPhase(value);clear()}}/>
    <div className="tl-options">
      <label><input type="checkbox" checked={origin} onChange={event=>{setOrigin(event.target.checked);clear()}}/> Origin is on the allowlist</label>
      {phase==='actual'&&<label><input type="checkbox" checked={csrf} onChange={event=>{setCsrf(event.target.checked);clear()}}/> Valid CSRF evidence</label>}
    </div>
    <div className="cf-gates"><div><strong>CORS</strong><span>{origin?'Origin permitted':'Origin refused'}</span></div><ArrowRight size={20} aria-hidden="true"/>
      <div><strong>CSRF</strong><span>{phase==='preflight'?'No unsafe request yet':csrf?'Valid evidence fixture':'Evidence missing'}</span></div></div>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(browserGate(phase==='preflight',origin,csrf));report()
      if(phase==='preflight')trials.record(origin?'preflight':'origin')
      else if(origin)trials.record(csrf?'accepted':'csrf')
    }}>Evaluate browser exchange</button>
    <Feedback title={result||'Awaiting browser exchange'} tone={!result?'pending':result==='Preflight accepted'||result==='Protected POST proceeds'?'trusted':'rejected'}>
      {trials.count} / 4 cases. A permitted preflight does not authenticate the caller or supply proof required for the actual POST.
    </Feedback>
  </div>
}

const styles=['Older adapter-style tutorial','SecurityFilterChain lambda DSL'] as const
const traces=['Unreviewed verbose dump','Scoped redacted filter trace'] as const
export function ConfigRelease({report}:Props) {
  const [style,setStyle]=useState<typeof styles[number]>(styles[0])
  const [trace,setTrace]=useState<typeof traces[number]>(traces[0])
  const [tests,setTests]=useState(false)
  const [result,setResult]=useState('')
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work rp-work cf-work" data-work="config-review">
    <LabHeading label="Policy release desk" title="Review the tutorial, diagnostics and boundary evidence">
      A proposed change uses an old tutorial and an unreviewed diagnostic dump. Choose the version-compatible configuration, collect safe evidence and include the fallback probe.
    </LabHeading>
    <div className="rp-builder"><div className="cf-rule-stack">
      <LabSelect label="Configuration style" value={style} options={styles} onChange={value=>{setStyle(value);clear()}}/>
      <LabSelect label="Diagnostic output" value={trace} options={traces} onChange={value=>{setTrace(value);clear()}}/>
      <div className="tl-options"><label><input type="checkbox" checked={tests} onChange={event=>{setTests(event.target.checked);clear()}}/> Include public and denied fallback probes</label></div>
    </div>
    <CodeSample language="text" wrap text={trace===traces[1]?'trace-42 · security chain selected\ntrace-42 · route decision recorded\nCredential and session fields omitted':'Diagnostic artifact withheld pending review.'}/></div>
    <button type="button" className="primary-button" onClick={()=>{
      const next=configContract(style===styles[1],trace===traces[1],tests)
      setResult(next);report(next==='Security policy revision verified')
    }}>Verify revised security policy</button>
    <Feedback title={result||'Awaiting policy release review'} tone={!result?'pending':result==='Security policy revision verified'?'trusted':'rejected'}>
      Compile against the installed version. Correlate only approved fields and turn off temporary traces after the investigation.
    </Feedback>
  </div>
}
