import { useState } from 'react'
import { ArrowDownRight, ArrowUpLeft, Boxes, Filter, Network, Server } from 'lucide-react'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabSelect, useTrials } from './TokenLifecycleLab'
import { chainOrders, invocationTrace, observerOutput, placements, routes, selectedChain, traceObserver, type ChainOrder, type Route } from './servletFlowModel'
import type { ReportActivity } from './missionIds'
import './spring-foundations.css'

type Props={report:ReportActivity}
const requestModes=[{id:'delegate',label:'Delegate downstream'},{id:'handled',label:'Handle in filter'}] as const
export function ServletCall({report}:Props) {
  const [mode,setMode]=useState<'delegate'|'handled'>('delegate')
  const [cursor,setCursor]=useState(-1)
  const events=invocationTrace(mode==='delegate')
  const trials=useTrials(['delegate','handled'],report)
  const last=events.length-1
  function step(){
    const next=cursor+1
    setCursor(next);report()
    if(next===last) trials.record(mode)
  }
  return <div className="mx-canvas tl-work sf-work" data-work="servlet-call">
    <LabHeading label="Invocation stack" title="Follow the request in and the response out">
      Advance a filter that delegates to MVC, then a filter that handles the request directly. Compare the visible return path.
    </LabHeading>
    <Switcher label="Filter behavior" options={requestModes} value={mode} onChange={value=>{setMode(value);setCursor(-1);report()}}/>
    <ol className="sv-stack" aria-label="Servlet invocation frames">
      {events.map((entry,i)=><li key={entry} data-visited={i<=cursor} aria-current={i===cursor?'step':undefined}>
        {entry==='Filter after'?<ArrowUpLeft size={19} aria-hidden="true"/>:<ArrowDownRight size={19} aria-hidden="true"/>}
        <strong>{entry}</strong><span>{i===cursor?'Current':i<cursor?'Visited':'Waiting'}</span>
      </li>)}
    </ol>
    <button type="button" className="primary-button" disabled={cursor===last} onClick={step}>Step invocation</button>
    <Feedback title={cursor<0?'Awaiting filter call':events[cursor]} tone={cursor<0?'pending':cursor===last?'trusted':'identity'}>
      {cursor===last?(mode==='delegate'?'Downstream returned to the outer filter.':'There was no downstream call. MVC was skipped.'):'Step through the selected branch.'} {trials.count} / 2 call paths compared.
    </Feedback>
  </div>
}

const delegates = [
  {id:'container-delegate',label:'DelegatingFilterProxy',value:'Servlet bridge',icon:Network,detail:'The container invokes this Filter. It delegates to a Filter bean in the Spring application context.'},
  {id:'spring-delegate',label:'FilterChainProxy',value:'Spring security dispatcher',icon:Filter,detail:'The typical Spring delegate selects the first applicable security chain and invokes its filters.'},
  {id:'mvc-delegate',label:'DispatcherServlet',value:'MVC front controller',icon:Boxes,detail:'After filters continue, MVC resolves a handler, invokes it through an adapter and processes its result.'},
]
export function ServletDelegates({report}:Props) {
  const [selected,setSelected]=useState<string|null>(null)
  const trials=useTrials(delegates.map(node=>node.id),report)
  const active=delegates.find(node=>node.id===selected)
  return <div className="mx-canvas tl-work sf-work" data-work="servlet-delegates">
    <LabHeading label="Component map" title="Inspect the handoffs between container, security and MVC">
      This path shows a request that continues. Open each component to see what it owns and what it delegates.
    </LabHeading>
    <TechnicalPath label="Servlet bridge to MVC" nodes={delegates.map(node=>({...node,tone:selected===node.id?'trusted':'identity'}))}
      selected={selected??undefined} onSelect={id=>{setSelected(id);trials.record(id)}}/>
    <Feedback title={active?.label??'Select a component'} tone={active?'identity':'pending'}>
      {active?.detail??'Start at the container registration.'} {trials.count} / 3 handoffs inspected.
    </Feedback>
  </div>
}

export function ChainRouter({report}:Props) {
  const [route,setRoute]=useState<Route>(routes[0])
  const [order,setOrder]=useState<ChainOrder>(chainOrders[0])
  const [checked,setChecked]=useState(false)
  const trials=useTrials(['specific','fallback','shadowed'],report)
  const selected=selectedChain(route,order)
  const exportFirst=order===chainOrders[0]
  const chains=exportFirst?['Export chain','Fallback chain']:['Fallback chain','Export chain']
  function clear(){setChecked(false);report()}
  return <div className="mx-canvas tl-work sf-work" data-work="servlet-routing">
    <LabHeading label="Chain switchboard" title="See which list wins when both match">
      Route the export and profile paths with the export matcher first. Then move the fallback first and rerun the export. The lists use the same access policy but different diagnostics.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Request path" value={route} options={routes} onChange={value=>{setRoute(value);clear()}}/>
      <LabSelect label="Chain priority" value={order} options={chainOrders} onChange={value=>{setOrder(value);clear()}}/>
    </div>
    <ol className="sv-switchboard" aria-label="Ordered matcher evaluation">{chains.map((chain,index)=>
      <li key={chain} data-active={checked&&selected===chain}><strong>{chain}</strong>
        <code>{chain==='Export chain'?'/exports/**':'any request'}</code>
        <span>{!checked?'Awaiting evaluation':selected===chain?'Selected':index===0?'No match':'Skipped after first match'}</span></li>)}
    </ol>
    <button type="button" className="primary-button" onClick={()=>{
      setChecked(true);report()
      if(route===routes[0]) trials.record(exportFirst?'specific':'shadowed')
      else if(exportFirst) trials.record('fallback')
    }}>Evaluate chain match</button>
    <Feedback title={checked?selected+' selected':'Waiting for match'} tone={checked?'identity':'pending'}>
      The first match supplies its list. The other list contributes no filters. {trials.count} / 3 routes compared.
    </Feedback>
  </div>
}

export function FilterOrder({report}:Props) {
  const [placement,setPlacement]=useState<typeof placements[number]>(placements[0])
  const [checked,setChecked]=useState(false)
  const trials=useTrials(placements,report)
  const first=placement===placements[0]
  const items=first?['Trace observer','Read route metadata']:['Read route metadata','Trace observer']
  return <div className="mx-canvas tl-work sf-work" data-work="servlet-order">
    <LabHeading label="Filter ordering" title="Move the observer after its data source">
      The observer writes a sanitized marker. Move it relative to the filter that sets route metadata, then run both orders.
    </LabHeading>
    <button type="button" className="secondary-button" onClick={()=>{
      setPlacement(first?placements[1]:placements[0]);setChecked(false);report()
    }}>Swap observer and metadata filter</button>
    <TechnicalPath label="Selected chain filter order" nodes={[...items,'Continue to MVC'].map(label=>({
      id:label,label,value:label==='Trace observer'&&checked?observerOutput(placement):'Configured stage',
      icon:label==='Continue to MVC'?Server:Filter,tone:label==='Trace observer'&&checked?first?'pending':'trusted':'identity',
    }))}/>
    <button type="button" className="primary-button" onClick={()=>{setChecked(true);trials.record(placement)}}>Run ordered filters</button>
    <Feedback title={checked?observerOutput(placement):'Order ready to test'} tone={!checked?'pending':first?'pending':'trusted'}>
      The same chain is selected in both runs. Moving the observer affects the metadata it can read. {trials.count} / 2 placements compared.
    </Feedback>
  </div>
}

export function ObserveChain({report}:Props) {
  const [order,setOrder]=useState<ChainOrder>(chainOrders[1])
  const [placement,setPlacement]=useState<typeof placements[number]>(placements[0])
  const [diagnostics,setDiagnostics]=useState(false)
  const [result,setResult]=useState<ReturnType<typeof traceObserver>|null>(null)
  function clear(){setResult(null);report()}
  const success=result?.visible&&result.selected==='Export chain'&&result.detail==='Observer has route metadata'
  return <div className="mx-canvas tl-work sf-work" data-work="servlet-review">
    <LabHeading label="Diagnostic release check" title="Recover the missing export trace marker">
      The export reaches MVC, but the marker is missing. Use the sanitized trace, verify which chain was chosen, then repair the observer’s position.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Release chain priority" value={order} options={chainOrders} onChange={value=>{setOrder(value);clear()}}/>
      <LabSelect label="Observer position" value={placement} options={placements} onChange={value=>{setPlacement(value);clear()}}/>
      <label><input type="checkbox" checked={diagnostics} onChange={event=>{setDiagnostics(event.target.checked);clear()}}/> Enable sanitized diagnostics</label>
    </div>
    <button type="button" className="primary-button" onClick={()=>{
      const next=traceObserver(routes[0],order,placement,diagnostics)
      setResult(next);report(next.visible&&next.selected==='Export chain'&&next.detail==='Observer has route metadata')
    }}>Verify active trace</button>
    {result?.visible&&<ol className="sv-evidence" aria-label="Correlated request trace">
      <li>route-17 · {result.selected} selected</li><li>route-17 · {result.detail}</li><li>route-17 · MVC reached</li>
    </ol>}
    <Feedback title={!result?'Awaiting release trace':success?'Export trace verified':!result.visible?'Diagnostics unavailable':result.detail} tone={!result?'pending':success?'trusted':'rejected'}>
      {success?'The export chain was selected, the observer received metadata, and MVC still ran.':'Use matching evidence before changing filter order. The simulation emits only fixture labels and a correlation ID.'}
    </Feedback>
  </div>
}
