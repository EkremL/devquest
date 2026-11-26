import { useState } from 'react'
import { Activity, ArrowDown, ArrowRight, CornerDownRight, FlaskConical, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher } from './MissionPrimitives'
import { commitResponse, components, diagnosticRequest, finalDecisions, matchRule, responseMessage, scenarios, securityTrace,
  successfulContract, type Component, type DraftResponse, type MatcherInput, type ResultStatus, type Scenario } from './securityDebuggerModel'
import type { ReportActivity } from './missionIds'
import './security-response-lab.css'

type Props = { report: ReportActivity }
const predictions = [{id:'200',label:'200 OK'},{id:'401',label:'401 Unauthorized'},{id:'403',label:'403 Forbidden'}] as const
type Prediction = typeof predictions[number]['id']

export function RequestTriage({ report }: Props) {
  const [scenario, setScenario] = useState<Scenario>('missing')
  const [prediction, setPrediction] = useState<Prediction | ''>('')
  const [ran, setRan] = useState(false)
  const [solved, setSolved] = useState<Scenario[]>([])
  const selected = scenarios.find(item=>item.id===scenario)!
  const trace = securityTrace(scenario)
  const correct = prediction === String(trace.status)
  function run() {
    const next = correct && !solved.includes(scenario) ? [...solved,scenario] : solved
    setSolved(next);setRan(true);report(next.length === scenarios.length)
  }
  return <div className="mx-canvas sr-debugger" data-panel="triage">
    <LabHeading label="Request triage · local Servlet model" title="Predict where the request stops">
      Configure one fictional request to GET /api/tasks/summary. Predict before running each credential case. The operation requires TASK_READ.
    </LabHeading>
    <Switcher label="Triage credential scenario" options={scenarios} value={scenario} onChange={id=>{
      setScenario(id);setPrediction('');setRan(false);report()
    }}/>
    <div className="sr-exchange">
      <CodeSample language="http" text={diagnosticRequest(scenario)} wrap activeLine={scenario === 'missing' ? undefined : 3}/>
      {ran ? <CodeSample language="http" text={successfulContract(trace.status)} wrap activeLine={trace.status === 401 ? 1 : 0}/> :
        <div className="sr-empty"><Activity size={24} aria-hidden="true"/><strong>Awaiting execution</strong><p>Choose a response prediction.</p></div>}
    </div>
    <div className="sr-toolbar"><Switcher label="Predict the status" options={predictions} value={prediction} onChange={id=>{
      setPrediction(id);setRan(false);report()
    }}/>
      <button type="button" className="primary-button" disabled={!prediction} onClick={run}>Run triage request</button></div>
    {ran && <><dl className="sr-evidence-grid">
      <div><dt>Authentication</dt><dd>{selected.principal}</dd></div><div><dt>Granted authority</dt><dd>{selected.grant}</dd></div>
      <div><dt>Authorization</dt><dd>{scenario === 'invalid' ? 'Not reached' : trace.status === 200 ? 'Allowed' : 'Denied'}</dd></div>
      <div><dt>Response writer</dt><dd>{components[trace.writer]}</dd></div>
    </dl><Feedback title={correct ? 'Triage prediction confirmed' : 'Prediction differed from the trace'} tone={correct ? 'trusted' : 'rejected'}>
      {trace.steps.at(-1)!.detail} {solved.length} / 4 correct predictions.
    </Feedback></>}
  </div>
}

const pipelineGroups = [
  { id:'front', label:'Before the downstream wrapper', nodes:['request','basic','manager','context'] },
  { id:'wrapped', label:'ExceptionTranslationFilter wraps this call', nodes:['authorization','controller'] },
  { id:'handlers', label:'Response writers', nodes:['entry','denied'] },
] as const
function ComponentLabel({ id }: { id: Component }) {
  return components[id].split(/(?=[A-Z])/).map((part,index) =>
    <span className="sr-component-part" key={index}>{index > 0 && <wbr/>}{part}</span>)
}

function RouteSignal({ caller, writer, edge }: { caller: Component; writer: Component; edge: 'normal' | 'direct' | 'exception' }) {
  return <div className="sr-signal" data-edge={edge}>
    <span><ComponentLabel id={caller}/></span><small>{edge === 'direct' ? 'Direct failure callback' : edge === 'exception' ? 'Downstream exception translated' : 'Normal downstream call'}</small>
    {edge === 'exception' ? <CornerDownRight size={17} aria-hidden="true"/> : <ArrowRight size={17} aria-hidden="true"/>}<span><ComponentLabel id={writer}/></span>
  </div>
}
export function FilterPathDebugger({ report }: Props) {
  const [scenario, setScenario] = useState<Scenario>('missing')
  const [position, setPosition] = useState(-1)
  const [done, setDone] = useState<Scenario[]>([])
  const trace = securityTrace(scenario)
  const current = trace.steps[position]
  const atEnd = position === trace.steps.length - 1
  const translating = current?.id === 'wrapper' && current.label === 'Exception translated'
  function advance() {
    const next = position + 1
    setPosition(next)
    const nextDone = next === trace.steps.length - 1 && !done.includes(scenario) ? [...done,scenario] : done
    setDone(nextDone);report(nextDone.length === scenarios.length)
  }
  function state(id: Component) {
    if (current?.id === id) return current.label
    if (trace.steps.slice(0,position+1).some(item=>item.id===id)) return 'Executed'
    return atEnd || !trace.steps.some(item=>item.id===id) ? 'Not reached' : 'Waiting'
  }
  return <div className="mx-canvas sr-debugger" data-panel="trace">
    <LabHeading label="Servlet call trace · simplified" title="Follow the call, then follow the exception">
      Step through all four scenarios. The wrapper calls downstream. A Basic failure earlier in the chain calls its own entry point directly.
    </LabHeading>
    <Switcher label="Filter trace scenario" options={scenarios} value={scenario} onChange={id=>{
      setScenario(id);setPosition(-1);report()
    }}/>
    <div className="sr-pipeline" aria-label="Simplified filter call and callback diagram">
      {pipelineGroups.map(group=><div key={group.id} className="sr-lane" data-lane={group.id} data-translating={group.id==='wrapped' && translating}>
        <div className="sr-lane-label"><span>{group.label}</span>{group.id === 'wrapped' && <small>{state('wrapper')}</small>}</div>
        <ol>{group.nodes.map((id,index)=><li key={id} data-active={current?.id===id} data-state={state(id)}>
          <strong><ComponentLabel id={id}/></strong><span>{state(id)}</span>
          {index<group.nodes.length-1 && group.id!=='handlers' && state(id)!=='Not reached' &&
            state(group.nodes[index+1])!=='Not reached' && <ArrowRight size={17} aria-hidden="true"/>}
        </li>)}</ol>
        {group.id==='front' && state('wrapper')!=='Not reached' && <ArrowDown size={17} aria-hidden="true" className="sr-downstream"/>}
      </div>)}
      {(translating || atEnd && trace.edge === 'exception') && <RouteSignal caller="authorization" writer="wrapper" edge="exception"/>}
      {atEnd && <RouteSignal caller={trace.caller} writer={trace.writer} edge={trace.edge}/>}
    </div>
    <div className="sr-toolbar">
      <button type="button" className="secondary-button" disabled={position<1} onClick={()=>setPosition(position-1)}>Previous filter step</button>
      <button type="button" className="primary-button" disabled={atEnd} onClick={advance}>Advance filter step</button>
      <button type="button" className="secondary-button" onClick={()=>setPosition(-1)}>Replay trace</button>
      <span className="sr-counter">{position+1} / {trace.steps.length} steps · {done.length} / 4 cases</span>
    </div>
    <Feedback title={current?.label ?? 'Trace ready'} tone={current ? atEnd && trace.status!==200 ? 'rejected' : 'identity' : 'pending'}>
      {current?.detail ?? 'The browser model omits chain selection, caching and filters unrelated to this example.'}
    </Feedback>
  </div>
}

type RouteChoice = '' | Component
const callers = ['basic','wrapper','authorization'] as const
const writers = ['entry','denied','controller'] as const
export function HandlerRouting({ report }: Props) {
  const [scenario, setScenario] = useState<Scenario>('invalid')
  const [caller, setCaller] = useState<RouteChoice>('')
  const [writer, setWriter] = useState<RouteChoice>('')
  const [result, setResult] = useState<boolean | null>(null)
  const [done, setDone] = useState<Scenario[]>([])
  const trace = securityTrace(scenario)
  function apply() {
    const valid = trace.caller===caller && trace.writer===writer
    const next = valid && !done.includes(scenario) ? [...done,scenario] : done
    setDone(next);setResult(valid);report(next.length===scenarios.length)
  }
  return <div className="mx-canvas sr-debugger" data-panel="handlers">
    <LabHeading label="Handler routing" title="Connect each result to its writer">
      Choose which stage hands off the response and which component writes it. Compare both routes to the same public 401.
    </LabHeading>
    <Switcher label="Handler outcome" options={scenarios} value={scenario} onChange={value=>{
      setScenario(value);setCaller('');setWriter('');setResult(null);report()
    }}/>
    <div className="sr-wiring">
      <label>Invoking stage<select aria-label="Invoking stage" value={caller} onChange={event=>{
        setCaller(event.currentTarget.value as RouteChoice);setResult(null);report()
      }}><option value="" disabled>Choose a stage</option>{callers.map(id=><option key={id} value={id}>{components[id]}</option>)}</select></label>
      <ArrowRight size={23} aria-hidden="true"/>
      <label>Response writer<select aria-label="Response writer" value={writer} onChange={event=>{
        setWriter(event.currentTarget.value as RouteChoice);setResult(null);report()
      }}><option value="" disabled>Choose a writer</option>{writers.map(id=><option key={id} value={id}>{components[id]}</option>)}</select></label>
      <button className="primary-button" type="button" disabled={!caller || !writer} onClick={apply}>Connect response path</button>
    </div>
    {result!==null && <>
      <RouteSignal caller={result ? trace.caller : caller as Component} writer={result ? trace.writer : writer as Component}
        edge={result ? trace.edge : 'normal'}/>
      <Feedback title={result ? 'Response path connected' : 'Revisit the handoff'} tone={result ? 'trusted' : 'rejected'}>
        {result ? trace.steps.at(-1)!.detail : caller!==trace.caller ? 'Locate the last stage that hands off control for this outcome.' :
          'The invoking stage is correct. Check which component owns this public status.'} {done.length} / 4 paths.
      </Feedback>
    </>}
  </div>
}

const broken: DraftResponse = { status:200, challenge:false, media:'text', safe:false, early:false }
const statuses = [{id:'401',label:'Authentication failure'},{id:'403',label:'Authenticated refusal'}] as const
type FailureStatus = typeof statuses[number]['id']
export function ResponseContractLab({ report }: Props) {
  const [expected, setExpected] = useState<FailureStatus>('401')
  const [draft, setDraft] = useState(broken)
  const [committed, setCommitted] = useState<ReturnType<typeof commitResponse> | null>(null)
  const [observedLate, setObservedLate] = useState(false)
  const [repaired, setRepaired] = useState<FailureStatus[]>([])
  function update<K extends keyof DraftResponse>(key: K, value: DraftResponse[K]) {
    setDraft({ ...draft,[key]:value });setCommitted(null);report()
  }
  function commit() {
    const result=commitResponse(Number(expected) as 401|403,draft)
    const late=observedLate || (draft.challenge && !draft.early)
    const next = result.mistakes.length===0 && !repaired.includes(expected) ? [...repaired,expected] : repaired
    setCommitted(result);setObservedLate(late);setRepaired(next);report(late && next.length===2)
  }
  return <div className="mx-canvas sr-debugger" data-panel="contract">
    <LabHeading label="Response contract workbench" title="Observe a late header, then repair both failures">
      Commit a draft with the Basic header queued after the body flush. Then satisfy both documented response contracts.
    </LabHeading>
    <Switcher label="Failure contract" options={statuses} value={expected} onChange={value=>{
      setExpected(value);setDraft(broken);setCommitted(null);report()
    }}/>
    <div className="sr-exchange sr-contract">
      <fieldset><legend>Draft before flush</legend>
        <label>HTTP status<select aria-label="HTTP status" value={draft.status} onChange={event=>update('status',Number(event.currentTarget.value) as ResultStatus)}>
          {predictions.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        <label>Media type<select aria-label="Media type" value={draft.media} onChange={event=>update('media',event.currentTarget.value as DraftResponse['media'])}>
          <option value="text">text/plain</option><option value="json">application/json</option></select></label>
        <label><input type="checkbox" checked={draft.safe} onChange={event=>update('safe',event.currentTarget.checked)}/> Generic public code</label>
        <label><input type="checkbox" checked={draft.challenge} onChange={event=>update('challenge',event.currentTarget.checked)}/> Add Basic challenge</label>
        <label><input type="checkbox" checked={draft.early} onChange={event=>update('early',event.currentTarget.checked)}/> Write challenge before body flush</label>
        <button type="button" className="primary-button" onClick={commit}>Commit simulated response</button>
      </fieldset>
      {committed ? <CodeSample language="http" text={committed.text} wrap/> :
        <div className="sr-empty"><ShieldCheck size={24} aria-hidden="true"/><strong>Response is editable</strong><p>Flush commits the drafted status and queued headers.</p></div>}
    </div>
    {committed && <Feedback title={committed.mistakes.length ? 'Committed with contract defects' : 'Committed contract passed'}
      tone={committed.mistakes.length ? 'rejected' : 'trusted'}>
      {committed.mistakes.length ? committed.mistakes.join(' ') :
        'The status, headers and safe JSON agree with this fixture. The committed response is frozen.'}
    </Feedback>}
  </div>
}

const standardRule = '    .requestMatchers(HttpMethod.GET, "/api/tasks/summary").hasAuthority("TASK_READ")'
const broadRule = '    .requestMatchers("/api/tasks/**").denyAll()'
const asConfigured = {method:'GET',path:'/api/tasks/summary',grant:'TASK_READ',broadFirst:false} as const
export function MatcherExplorer({ report }: Props) {
  const [input,setInput] = useState<MatcherInput>(asConfigured)
  const [result,setResult] = useState<ReturnType<typeof matchRule> | null>(null)
  const [seen,setSeen] = useState<string[]>([])
  function update<K extends keyof MatcherInput>(key:K,value:MatcherInput[K]) {
    setInput({...input,[key]:value});setResult(null);report()
  }
  function evaluate() {
    const output=matchRule(input)
    const key=input.broadFirst && input.method==='GET' && input.path==='/api/tasks/summary' ? 'shadowed' :
      output.allowed ? 'allowed' : !input.broadFirst && output.rule==='Summary GET' ? 'missing-grant' :
        !input.broadFirst && input.method==='POST' && input.path==='/api/tasks/summary' ? 'wrong-method' : ''
    const next=seen.includes(key) ? seen : [...seen,key]
    setResult(output);setSeen(next);report(['shadowed','allowed','missing-grant','wrong-method'].every(item=>next.includes(item)))
  }
  const listing=['http.authorizeHttpRequests(rules -> rules',...(input.broadFirst?[broadRule,standardRule]:[standardRule,broadRule]),
    '    .anyRequest().denyAll());']
  const index=result?.rule==='Summary GET' ? listing.indexOf(standardRule) :
    result?.rule==='Task subtree deny' ? listing.indexOf(broadRule) : 3
  return <div className="mx-canvas sr-debugger" data-panel="matcher">
    <LabHeading label="Authorization matcher" title="Find the first matching rule">
      Compare the exact GET with a POST, a missing read grant and a broad matcher placed first. Assume earlier security checks have already run.
    </LabHeading>
    <div className="sr-choice-grid">
      <label>Method<select aria-label="Matcher method" value={input.method} onChange={event=>update('method',event.currentTarget.value as MatcherInput['method'])}><option>GET</option><option>POST</option></select></label>
      <label>Path<select aria-label="Matcher path" value={input.path} onChange={event=>update('path',event.currentTarget.value as MatcherInput['path'])}><option>/api/tasks/summary</option><option>/api/tasks/archive</option><option>/status</option></select></label>
      <label>Caller grant<select aria-label="Matcher caller grant" value={input.grant} onChange={event=>update('grant',event.currentTarget.value as MatcherInput['grant'])}><option>None</option><option>TASK_READ</option><option>TASK_CREATE</option></select></label>
    </div>
    <div className="sr-toolbar">
      <label><input type="checkbox" checked={input.broadFirst} onChange={event=>update('broadFirst',event.currentTarget.checked)}/> Put subtree denial first</label>
      <button type="button" className="primary-button" onClick={evaluate}>Evaluate matcher</button>
    </div>
    <CodeSample language="java" text={listing.join('\n')} activeLine={result ? index : undefined} wrap/>
    <Feedback title={result ? (result.allowed?'Allowed · ':'Denied · ')+result.rule : 'Rule waiting for a request'}
      tone={result ? result.allowed ? 'trusted' : 'rejected' : 'pending'}>
      {result?.reason ?? 'The matcher selects an authorization rule. Credential verification occurs elsewhere.'}
    </Feedback>
  </div>
}

const labEvidence = [
  {id:'wire',label:'Raw response',text:responseMessage(401,false,'application/json','{"code":"authentication_required"}')},
  {id:'trace',label:'Component trace',text:'Missing evidence: authorization denied → exception translation → entry point\nRejected Basic evidence: Basic failure → entry point\nProtected controller: not reached'},
  {id:'checks',label:'Test matrix',text:'Absent evidence: 401, challenge assertion failed\nRejected evidence: 401, challenge assertion failed\nVerified creator: 403, passed\nVerified reader: 200, passed'},
] as const
export function MissingChallengeLab({ report }: Props) {
  const [selected,setSelected] = useState<typeof labEvidence[number]['id']>('wire')
  const [inspected,setInspected] = useState<string[]>(['wire'])
  const [choice,setChoice] = useState('')
  const [result,setResult] = useState<boolean|null>(null)
  return <div className="mx-canvas sr-debugger" data-panel="lab">
    <LabHeading label="Coding Lab preparation" title="Two 401s, one missing header">
      Inspect the three records. Identify the first place to investigate without changing authentication or authorization.
    </LabHeading>
    <Switcher label="Coding Lab evidence" options={labEvidence} value={selected} onChange={id=>{
      setSelected(id);setInspected([...inspected,id]);setResult(null);report()
    }}/>
    <CodeSample language={selected==='wire'?'http':'text'} text={labEvidence.find(item=>item.id===selected)!.text} wrap/>
    <div className="sr-toolbar">
      <label>First inspection<select aria-label="First inspection" value={choice} onChange={event=>{
        setChoice(event.currentTarget.value);setResult(null);report()
      }}><option value="" disabled>Choose…</option><option>Controller response mapping</option><option>Entry-point response writer</option><option>Authority assignments</option></select></label>
      <button type="button" className="primary-button" disabled={!choice} onClick={()=>{
        const valid=choice==='Entry-point response writer' && labEvidence.every(item=>inspected.includes(item.id))
        setResult(valid);report(valid)
      }}>Check the investigation</button>
      <Link className="secondary-button" to="../lab" relative="path"><FlaskConical size={16} aria-hidden="true"/>Open Coding Lab</Link>
    </div>
    {result!==null && <Feedback title={result?'Investigation ready for IntelliJ':'Inspect the evidence again'} tone={result?'trusted':'rejected'}>
      {result?'Both failures reach an entry point and neither reaches MVC. Use the starter tests and trace the response writer in your local exercise.' :
        'Compare the request paths and their test observations. The successful and forbidden controls constrain what needs changing.'}
    </Feedback>}
  </div>
}

const incident = [
  {id:'auth',label:'Authentication log',text:'credential.verifier = accepted\nprincipal = demo-creator\ngrant = TASK_CREATE'},
  {id:'rule',label:'Authorization trace',text:'matched = GET /api/tasks/summary\nrequired = TASK_READ\nresult = denied\ncontroller = not reached'},
  {id:'response',label:'Actual wire response',text:responseMessage(401,true,'application/json','{"code":"authentication_required"}')},
] as const
export function SecurityIncident({ report }: Props) {
  const [selected,setSelected] = useState<typeof incident[number]['id']>('auth')
  const [inspected,setInspected] = useState<string[]>(['auth'])
  const [result,setResult] = useState<number|null>(null)
  return <div className="mx-canvas sr-debugger" data-panel="incident">
    <LabHeading label="Final incident review" title="Why is a verified caller asked to sign in again?">
      Compare provider, policy and response observations. Preserve the task permission while diagnosing the writer.
    </LabHeading>
    <Switcher label="Final security incident evidence" options={incident} value={selected} onChange={id=>{
      setSelected(id);setInspected([...inspected,id]);setResult(null);report()
    }}/>
    <CodeSample language={selected==='response'?'http':'text'} text={incident.find(item=>item.id===selected)!.text} wrap/>
    <form onChange={()=>{setResult(null);report()}} onSubmit={event=>{
      event.preventDefault()
      const data=new FormData(event.currentTarget)
      const index=incident.every(item=>inspected.includes(item.id)) ?
        finalDecisions.findIndex(item=>data.get(item.key)!==item.options[item.answer]) : -2
      setResult(index);report(index===-1)
    }}>
      <div className="sr-choice-grid sr-final-grid">{finalDecisions.map(item=><label key={item.key}>{item.label}
        <select aria-label={item.label} name={item.key} required defaultValue=""><option value="" disabled>Choose…</option>
          {item.options.map(option=><option key={option}>{option}</option>)}</select></label>)}</div>
      <button type="submit" className="primary-button">Submit security diagnosis</button>
    </form>
    {result!==null && <Feedback title={result===-1?'Security incident resolved':'Recheck the incident evidence'} tone={result===-1?'trusted':'rejected'}>
      {result===-1?'The creator authenticated, failed the read rule and should receive the configured 403 from the denial path. Inspect the exception handler mapping and what it writes.' :
        result===-2?'Inspect all three records before submitting.':'Review: '+finalDecisions[result].label}
    </Feedback>}
  </div>
}
