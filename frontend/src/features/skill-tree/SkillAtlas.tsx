import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Background, BaseEdge, Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow, useViewport, type NodeProps, type EdgeProps } from '@xyflow/react'
import { ArrowUpRight, Check, ChevronRight, CircleAlert, Compass, Crosshair, Expand, Fingerprint, Flag, Focus, GitBranch, KeyRound, Layers3, List, LockKeyhole, Maximize, Minus, Network, Plus, Radar, ScanLine, Shield, ShieldCheck, Workflow, X } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { getCurriculum, statusLabels, type Section } from '../curriculum/api'
import { accents, codeOf, makeAtlas, ordered, titleOf, type AtlasNode, type Trail } from './layout'
import './atlas.css'

const symbols=[Compass,Fingerprint,Layers3,KeyRound,ScanLine,LockKeyhole,Workflow,Shield,Radar,Network,Flag]
const colorStyle=(color:string)=>({'--ink':color} as CSSProperties)
const Selection=createContext({owner:'',selected:'',pick:(_owner:string,_id:string)=>{}})
function Sigil({index}:{index:number}){
  const Icon=symbols[index%symbols.length]
  return <span className="atlas-sigil" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="atlas-setting">
      <path d="M40 2 72 20 76 50 57 73 23 73 4 50 8 20Z" fill="#101d33" stroke="currentColor" strokeWidth="2"/>
      <path d="M40 7 68 23 70 48 54 67 26 67 10 48 12 23Z" fill="currentColor" opacity=".13"/>
      <path d="m40 10 25 14v30L40 68 15 54V24Z" fill="none" stroke="currentColor" opacity=".7"/>
      <path d="m40 2 0 8m32 10-7 4M4 50l11 4m42 19-3-6M8 20l7 4" stroke="currentColor" strokeWidth="3"/>
      <path d="m40 8 3 4-3 4-3-4z" fill="currentColor"/>
    </svg><Icon className="atlas-glyph" strokeWidth={1.55}/></span>
}
function Skill({data}:NodeProps<AtlasNode>){
  const {owner,selected,pick}=useContext(Selection)
  const {zoom}=useViewport()
  const {section,hub,index}=data
  const stats=section.statistics.sessionTopics
  const active=selected===section.id
  return <>
    <Handle type="source" position={Position.Right}/><Handle type="target" position={Position.Left}/>
    <button className={'atlas-point nodrag '+(hub?'hub':'minor')} style={colorStyle(accents[index%accents.length])}
      data-lit={stats.state==='COMPLETED'} data-progress={stats.state} data-cluster={data.owner===owner}
      data-label-above={[2,5,6,8,9].includes(index%11)} aria-pressed={active}
      title={section.title} aria-label={`${section.title}, ${statusLabels[stats.state]}`} onClick={()=>pick(data.owner,section.id)}>
      {hub?<><svg viewBox="-100 -100 200 200" className="atlas-engraving" aria-hidden="true">
        <g transform={`rotate(${index*41})`} fill="none" stroke="currentColor">
          <circle r="83" strokeDasharray="132 17 70 55" opacity=".38"/><circle r="77" strokeDasharray="1 8" strokeWidth="3" opacity=".5"/>
          <path d="M-96 0h12m168 0h12M0-96v12m0 168v12" opacity=".65"/>
        </g></svg><Sigil index={index}/></>:<span className={'atlas-gem cut-'+data.ordinal%3}>{stats.state==='COMPLETED'?<Check size={14}/>:<i/>}</span>}
      {stats.state==='NEEDS_REVIEW'&&<CircleAlert className="atlas-review" size={14} aria-hidden="true"/>}
      {(hub||active||(zoom>=.95&&data.owner===owner))&&<span className="atlas-label"><small>{codeOf(section)}</small>{hub&&<b>{titleOf(section)}</b>}</span>}
    </button>
  </>
}
function Thread({id,data}:EdgeProps<Trail>){
  const {owner}=useContext(Selection)
  if(!data) return null
  const color=data.completed?'#a7f3d0':data.color
  const active=owner===data.owner
  return <g style={{color}} className={data.completed?'atlas-lit':''}>
    <BaseEdge id={id} path={data.path} interactionWidth={0} style={{stroke:color,opacity:data.completed?1:active?.95:data.route?.66:.52,strokeWidth:data.route?3.3:active?2.8:2.1,strokeDasharray:data.route?'10 5':undefined}}/>
  </g>
}
const nodeTypes={skill:Skill},edgeTypes={trail:Thread}
export default function SkillAtlas(){
  const query=useQuery({queryKey:['curriculum'],queryFn:getCurriculum})
  if(!query.data) return <section className="atlas-wait"><h1>Skill atlas</h1><p role={query.isError?'alert':'status'}>{query.error?.message??'Loading curriculum…'}</p>{query.isError&&<button onClick={()=>void query.refetch()}>Retry</button>}<Link to="/roadmap">Open Roadmap</Link></section>
  return <ReactFlowProvider><Atlas root={query.data.root} refreshing={query.isFetching} refresh={()=>void query.refetch()} refreshError={query.error?.message}/></ReactFlowProvider>
}
function Atlas({root, refreshing, refresh, refreshError}:{
  root:Section; refreshing:boolean; refresh:()=>void; refreshError?:string
}){
  const modules=useMemo(()=>ordered(root.children,'MODULE'),[root])
  const graph=useMemo(()=>makeAtlas(modules),[modules])
  const flow=useReactFlow()
  const {zoom}=useViewport()
  const [params,setParams]=useSearchParams()
  const id=params.get('node')
  const [focus,setFocus]=useState(false),[browse,setBrowse]=useState(false)
  const map=useRef<HTMLElement>(null)
  const browseButton=useRef<HTMLButtonElement>(null)
  const current=graph.nodes.find(n=>n.id===id)??graph.nodes[0]
  const module=modules.find(m=>m.id===current?.data.owner)
  const fitCluster=(owner:string)=>void flow.fitView({nodes:graph.nodes.filter(n=>n.data.owner===owner),padding:map.current && map.current.clientWidth<500?'51px':'66px',maxZoom:1.65})
  const select=(owner:string,next:string,force=false)=>{
    const target=graph.nodes.find(n=>n.id===next)
    if(!target) return
    setParams(previous=>{const updated=new URLSearchParams(previous);updated.set('node',next);return updated},{replace:true,preventScrollReset:true})
    const viewport=flow.getViewport()
    const x=target.position.x*viewport.zoom+viewport.x
    const y=target.position.y*viewport.zoom+viewport.y
    const canvas=map.current
    if(force||owner!==module?.id||viewport.zoom<.8||!canvas||x<45||y<63||x>canvas.clientWidth-45||y>canvas.clientHeight-58) fitCluster(owner)
  }
  function closeBrowse(){setBrowse(false);browseButton.current?.focus()}
  useEffect(()=>{
    const escape=(e:KeyboardEvent)=>{
      if(e.key!=='Escape'||e.defaultPrevented)return
      if(browse){setBrowse(false);browseButton.current?.focus()}
      else if(focus)setFocus(false)
    }
    window.addEventListener('keydown',escape)
    return()=>window.removeEventListener('keydown',escape)
  },[browse,focus])
  if(!module||!current)return <section className="atlas-wait"><h1>No modules available</h1><Link to="/roadmap">Open Roadmap</Link></section>
  const section=current.data.section
  const topics=section.statistics.sessionTopics
  const sessions=ordered(module.children,'SESSION')
  const ink=accents[current.data.index%accents.length]
  return <div className={'atlas '+(focus?'atlas-focus':'')} style={colorStyle(ink)}>
    <header className="atlas-heading"><div><p>SPRING SECURITY <span>/</span> CURRICULUM EXPLORER</p><h1>Skill atlas<span>.</span></h1></div><div className="atlas-count"><b>{modules.length}</b> modules <i/> <b>{graph.nodes.length-modules.length}</b> sessions</div></header>
    {refreshError&&<p role="alert" className="atlas-refresh-error">{refreshError} Showing the last loaded curriculum.</p>}
    <div className="atlas-body">
      <section ref={map} className="atlas-map" aria-label="Skill atlas map">
      <div className="atlas-map-tools"><button ref={browseButton} onClick={()=>setBrowse(!browse)} aria-expanded={browse} aria-controls={browse?'atlas-browser':undefined}><List size={16}/> Browse</button><button onClick={()=>setFocus(!focus)} aria-pressed={focus}><Expand size={15}/>{focus?'Exit focus':'Focus map'}</button></div>
      <div className="atlas-controls"><button aria-label="Zoom out" onClick={()=>void flow.zoomOut()}><Minus/></button><output>{Math.round(zoom*100)}%</output><button aria-label="Zoom in" onClick={()=>void flow.zoomIn()}><Plus/></button><button aria-label="Fit whole atlas" onClick={()=>void flow.fitView({padding:'42px'})}><Maximize/></button></div>
      {browse&&<section className="atlas-browser" id="atlas-browser" aria-label="Browse curriculum"><header><strong>Browse curriculum</strong><button aria-label="Close browser" onClick={closeBrowse}><X size={16}/></button></header>{modules.map(m=><details key={m.id}><summary>{m.title}</summary>{[m,...ordered(m.children,'SESSION')].map(s=><button key={s.id} onClick={()=>{select(m.id,s.id,true);closeBrowse()}}>{s===m?'Inspect module':s.title}</button>)}</details>)}</section>}
      <Selection.Provider value={{owner:module.id,selected:section.id,pick:select}}>
        <ReactFlow {...graph} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{nodes:graph.nodes.filter(n=>id?n.data.owner===module.id:n.data.index<4),padding:'56px',maxZoom:1}} minZoom={.07} maxZoom={2.6}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false} edgesFocusable={false}
          zoomOnDoubleClick={false} zoomOnScroll={false}><Background gap={35} size={1} color="#56708e"/></ReactFlow>
      </Selection.Provider>
      {focus&&<Link className="atlas-focus-link" to={'/roadmap/'+(current.data.hub?'modules/':'sessions/')+section.id}>{codeOf(section)} <ArrowUpRight size={15}/></Link>}
      </section>
      <aside className="atlas-inspector" aria-label="Selection details"><p className="atlas-kicker"><Crosshair size={14}/> SELECTION</p><div className="atlas-seal"><Sigil index={current.data.index}/></div><p className="atlas-index">{codeOf(section)}</p><h2 aria-live="polite">{titleOf(section)}</h2><p className="atlas-state">{statusLabels[topics.state]} <b>{topics.percentage}%</b></p><div className="atlas-meter"><i style={{width:topics.percentage+'%'}}/></div><p className="atlas-caption">{topics.completed} of {topics.total} {current.data.hub?'session topics':'topics'} complete</p>
      {current.data.hub&&<p className="atlas-caption">Module requirements: {section.statistics.moduleRequirements.total ? `${section.statistics.moduleRequirements.completed} / ${section.statistics.moduleRequirements.total} complete` : 'None'}</p>}
      <button className="atlas-locate" onClick={()=>fitCluster(module.id)}><Focus size={16}/> Zoom to cluster</button><Link className="atlas-open" to={'/roadmap/'+(current.data.hub?'modules/':'sessions/')+section.id}>Open {current.data.hub?'module':'session'} <ArrowUpRight size={16}/></Link>
      <h3><GitBranch size={14}/> Sessions <span>{sessions.length}</span></h3><ul>{sessions.map(s=><li key={s.id}><button aria-pressed={s.id===section.id} onClick={()=>select(module.id,s.id)}>{s.statistics.sessionTopics.state==='COMPLETED'?<ShieldCheck size={15}/>:<ChevronRight size={15}/>}<span>{titleOf(s)}</span></button></li>)}</ul>
      </aside>
    </div>
    <footer className="atlas-footer"><span><i/> Curriculum order</span><span><i/> Module branch</span><span><i/> Completed</span><button disabled={refreshing} onClick={refresh}>{refreshing?'Refreshing…':'Refresh progress'}</button></footer>
  </div>
}
