import { useState } from 'react'
import { ArrowRight, Boxes, Fingerprint, Server, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabSelect, useTrials } from './TokenLifecycleLab'
import { actors, securityBoundary, type Actor } from './springBoundaryModel'
import type { ReportActivity } from './missionIds'
import './spring-foundations.css'

type Props = {report:ReportActivity}
const stageNames=['Servlet container','Spring Security','Spring MVC','Export service'] as const
const walkthrough = [
  {title:'Container invokes filters',detail:'The registered filter receives a request before the mapped servlet.',icon:Server},
  {title:'Security evaluates the request',detail:'This fixture checks the configured protection and route policy before continuing.',icon:ShieldCheck},
  {title:'DispatcherServlet selects the handler',detail:'MVC dispatches only after the downstream chain is invoked.',icon:Boxes},
  {title:'Service applies the stored workspace rule',detail:'The domain check uses the verified scope and the stored export.',icon:Fingerprint},
]

export function BoundaryTrace({report}:Props) {
  const [actor,setActor]=useState<Actor>(actors[0])
  const [cursor,setCursor]=useState(-1)
  const trials=useTrials(['stopped','forwarded'],report)
  const last=actor===actors[2]?3:1
  function step() {
    const next=cursor+1
    setCursor(next);report()
    if(next===last)trials.record(last===1?'stopped':'forwarded')
  }
  return <div className="mx-canvas tl-work sf-work" data-work="spring-trace">
    <LabHeading label="Request execution" title="Find out whether the controller runs">
      Step through a fictional GET for an export. Compare a request with missing identity against a verified exporter. The record belongs to the caller’s workspace.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Request identity" value={actor} options={actors} onChange={value=>{setActor(value);setCursor(-1);report()}}/>
      <button type="button" className="primary-button" disabled={cursor===last} onClick={step}>Advance request</button>
    </div>
    <TechnicalPath label="Servlet request path" nodes={walkthrough.map(({icon},i)=>({
      id:stageNames[i],label:stageNames[i],icon,
      value:i>last&&cursor===last?'Skipped':i===cursor?'Current stage':i<cursor?'Visited':'Waiting',
      tone:i===cursor?cursor===last&&last===1?'rejected':'identity':i<cursor?'trusted':'quiet',
    }))}/>
    <Feedback title={cursor<0?'Ready to trace':cursor===last&&last===1?'Stopped before MVC':walkthrough[cursor].title}
      tone={cursor<0?'pending':cursor===last&&last===1?'rejected':'identity'}>
      {cursor<0?'Advance the request to observe a real boundary in the model.':cursor===last&&last===1?
        actor===actors[0]?'No verified principal satisfied the route. The controller was skipped.':'The verified caller lacked export:read. The controller was skipped.':
        walkthrough[cursor].detail} {trials.count} / 2 paths compared.
    </Feedback>
  </div>
}

const fields=[{id:'principal',label:'Principal'},{id:'authority',label:'Authorities'}] as const
export function SpringIdentity({report}:Props) {
  const [actor,setActor]=useState<Actor>(actors[0])
  const [field,setField]=useState<'principal'|'authority'|null>(null)
  const trials=useTrials(['anonymous','viewer','exporter'],report)
  const verified=actor!==actors[0]
  return <div className="mx-canvas tl-work sf-work" data-work="spring-identity">
    <LabHeading label="Security context inspector" title="Read the object behind the decision">
      Compare the anonymous principal, the viewer’s authorities and the exporter’s authorities. These are illustrative objects after the configured authentication path.
    </LabHeading>
    <div className="sf-inspect">
      <LabSelect label="Authentication state" value={actor} options={actors} onChange={value=>{setActor(value);setField(null);report()}}/>
      <div className="mx-switcher" role="group" aria-label="Authentication fields">{fields.map(({id,label})=>
        <button type="button" key={id} aria-pressed={field===id} onClick={()=>{
          setField(id);report()
          if(!verified&&id==='principal')trials.record('anonymous')
          if(verified&&id==='authority')trials.record(actor===actors[1]?'viewer':'exporter')
        }}>{label}</button>)}</div>
      <CodeSample language="text" text={(verified?'Verified Authentication':'AnonymousAuthenticationToken')+'\n'+
        (field==='principal'?'principal = '+(verified?'fixture-user':'anonymousUser'):field==='authority'?
          'authorities = '+(actor===actors[2]?'[export:read]':verified?'[profile:read]':'[ROLE_ANONYMOUS]'):'Select a field to inspect.')} wrap/>
    </div>
    <Feedback title={field==='principal'?(verified?'Verified principal':'Anonymous placeholder'):field==='authority'?
      actor===actors[2]?'Required authority present':'Required authority absent':'Awaiting field inspection'} tone={field?'identity':'pending'}>
      The route uses export:read. Identity verification and permission remain separate. {trials.count} / 3 observations.
    </Feedback>
  </div>
}

const methods=['GET','POST'] as const
export function SpringProtection({report}:Props) {
  const [method,setMethod]=useState<typeof methods[number]>('GET')
  const [token,setToken]=useState(false)
  const [result,setResult]=useState('')
  const trials=useTrials(['read','blocked','write'],report)
  return <div className="mx-canvas tl-work sf-work" data-work="spring-protection">
    <LabHeading label="CSRF comparison" title="Keep the login and change the request">
      The same browser session has export:read. Compare a GET read with a POST export, then repeat POST with verified CSRF evidence.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="HTTP method" value={method} options={methods} onChange={value=>{setMethod(value);setResult('');report()}}/>
      <label><input type="checkbox" checked={token} onChange={event=>{setToken(event.target.checked);setResult('');report()}}/> Valid CSRF evidence</label>
    </div>
    <div className="sf-lanes"><div><strong>Browser session</strong><span>Authenticated exporter</span></div><ArrowRight size={20} aria-hidden="true"/>
      <div><strong>CSRF gate</strong><span>{method==='GET'?'Safe read is outside the default check':'POST requires valid evidence'}</span></div></div>
    <button type="button" className="primary-button" onClick={()=>{
      const decision=securityBoundary({actor:actors[2],method,csrf:token,inWorkspace:true})
      setResult(decision);trials.record(method==='GET'?'read':token?'write':'blocked')
    }}>Run protection check</button>
    <Feedback title={result||'Waiting for request'} tone={!result?'pending':result==='Export available'?'trusted':'rejected'}>
      This fixture uses the default method-based CSRF matcher and no custom exceptions. {trials.count} / 3 comparisons.
    </Feedback>
  </div>
}

const records=['Own workspace','Other workspace'] as const
export function SpringDomain({report}:Props) {
  const [record,setRecord]=useState<typeof records[number]>('Own workspace')
  const [result,setResult]=useState('')
  const trials=useTrials(records,report)
  return <div className="mx-canvas tl-work sf-work" data-work="spring-domain">
    <LabHeading label="Boundary audit" title="Change the record while keeping the same authority">
      The request guard accepts the caller’s export:read authority. Check both stored workspace relationships at the service boundary.
    </LabHeading>
    <Switcher label="Stored export" options={records.map(id=>({id,label:id}))} value={record} onChange={value=>{setRecord(value);setResult('');report()}}/>
    <div className="sf-lanes"><div><strong>Request policy</strong><span>Authority accepted</span></div><ArrowRight size={20} aria-hidden="true"/>
      <div><strong>Domain policy</strong><span>{record}</span></div></div>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(securityBoundary({actor:actors[2],method:'GET',csrf:false,inWorkspace:record===records[0]}));trials.record(record)
    }}>Compare policies</button>
    <Feedback title={result||'Awaiting stored-record check'} tone={!result?'pending':record===records[0]?'trusted':'rejected'}>
      Record ownership is determined from trusted application data. It does not come from the route’s authority name.
    </Feedback>
  </div>
}

const ownership=['Wire semantics','Configured filter chain','Domain service'] as const
export function SpringContract({report}:Props) {
  const [route,setRoute]=useState<typeof ownership[number]>(ownership[0])
  const [scope,setScope]=useState<typeof ownership[number]>(ownership[0])
  const [protocol,setProtocol]=useState<typeof ownership[number]>(ownership[2])
  const [result,setResult]=useState('')
  const change=(setter:(v:typeof ownership[number])=>void)=>(value:typeof ownership[number])=>{setter(value);setResult('');report()}
  return <div className="mx-canvas tl-work sf-work" data-work="spring-review">
    <LabHeading label="Release review" title="Assign responsibility before approving the export">
      A request failure and a cross-workspace refusal need separate diagnostics. Assign each part of the release contract to the layer that owns it.
    </LabHeading>
    <div className="auth-audit">
      <LabSelect label="Route authority check" value={route} options={ownership} onChange={change(setRoute)}/>
      <LabSelect label="Stored workspace check" value={scope} options={ownership} onChange={change(setScope)}/>
      <LabSelect label="HTTP method meaning" value={protocol} options={ownership} onChange={change(setProtocol)}/>
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      const next=route!==ownership[1]?'Place route authorization in the configured chain':
        scope!==ownership[2]?'Place stored-record policy with the service':
        protocol!==ownership[0]?'Take method semantics from HTTP':'Boundary contract satisfied'
      setResult(next);report(next==='Boundary contract satisfied')
    }}>Review boundary contract</button>
    <Feedback title={result||'Awaiting release review'} tone={!result?'pending':result==='Boundary contract satisfied'?'trusted':'rejected'}>
      Verify the configured request guard and service policy independently. The protocol defines the wire contract they implement.
    </Feedback>
  </div>
}
