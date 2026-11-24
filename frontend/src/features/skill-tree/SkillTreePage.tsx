import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Compass, Minus, Network, Plus } from 'lucide-react'
import { Background, BaseEdge, Controls, Handle, Position, ReactFlow, useNodesInitialized, useReactFlow, type EdgeProps, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getCurriculum, statusLabels, type Section } from '../curriculum/api'
import { buildTree, sessionsOf, type MapEdge, type ModuleNode, type SessionNode } from './tree'
import './skill-tree.css'

function topicState(section: Section) {
  const state = section.statistics.sessionTopics.state
  return state === 'NEEDS_REVIEW' ? 'IN_PROGRESS' : state
}

function SkillNode({ data }: NodeProps<ModuleNode>) {
  const { section, active, open, choose, toggle } = data
  const topics = section.statistics.sessionTopics
  const [number, ...title] = section.title.split(' — ')
  const state = topicState(section)
  return <div className="skill-module" data-state={state} data-selected={active}>
    <Handle type="target" position={Position.Top} isConnectable={false} />
    <button type="button" className="skill-node nodrag"
      aria-pressed={active} title={section.title} aria-label={`${section.title}, ${topics.percentage}% of session topics, ${statusLabels[state]}`}
      onClick={() => choose(section.id)}>
      <span className="skill-medallion">{state === 'COMPLETED' ? <Check size={18} aria-hidden="true" /> : number.match(/\d+/)?.[0] ?? <Compass size={18} aria-hidden="true" />}</span>
      <span className="skill-node-label">{number} · {statusLabels[state]}</span>
      {title.length > 0 && <strong>{title.join(' — ')}</strong>}
      <span className="skill-node-progress"><span className="skill-track"><span style={{ width: `${topics.percentage}%` }} /></span>{topics.percentage}%</span>
    </button>
    {sessionsOf(section).length > 0 && <button type="button" className="skill-branch-toggle nodrag"
      aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} sessions for ${section.title}`}
      onClick={() => toggle(section.id)}>{open ? <Minus size={17} /> : <Plus size={17} />}</button>}
    <Handle type="source" position={Position.Bottom} isConnectable={false} />
  </div>
}

function SkillSession({ data }: NodeProps<SessionNode>) {
  const { section } = data
  const topics = section.statistics.sessionTopics
  const [number, ...title] = section.title.split(' — ')
  return <>
    <Handle type="target" position={Position.Top} isConnectable={false} />
    <Link className="skill-session nodrag" data-state={topicState(section)} title={section.title} to={`/roadmap/sessions/${section.id}`}
      aria-label={`Open ${section.title}, ${topics.percentage}% of topics completed`}>
      <span>{number}<b>{topics.percentage}%</b></span>
      <strong>{title.join(' — ') || number}</strong>
    </Link>
  </>
}

function MapCompass() {
  return <div className="skill-compass" aria-hidden="true">
    <Compass size={69} strokeWidth={0.7} /><span>SPRING SECURITY</span><small>LEARNING TRAIL</small>
  </div>
}

function Trail({ id, data }: EdgeProps<MapEdge>) {
  return data ? <BaseEdge id={id} path={data.path} interactionWidth={0} /> : null
}

const nodeTypes = { module: SkillNode, session: SkillSession, compass: MapCompass }
const edgeTypes = { trail: Trail }
const fitOptions = { padding: '36px', maxZoom: 1.1 } as const

function BranchCamera({ expanded, ids }: { expanded: string | null; ids: string[] }) {
  const { fitView } = useReactFlow()
  const ready = useNodesInitialized()
  const previous = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || previous.current === expanded) return
    previous.current = expanded
    void fitView({ ...fitOptions, nodes: expanded ? ids.map(id => ({ id })) : undefined })
  }, [expanded, ids, ready, fitView])
  return null
}

export function SkillTreePage() {
  const query = useQuery({ queryKey: ['curriculum'], queryFn: getCurriculum })
  const modules = useMemo(() => (query.data?.root.children ?? []).filter(node => node.kind === 'MODULE')
    .sort((a, b) => a.position - b.position), [query.data])
  const [selected, select] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const module = modules.find(section => section.id === selected) ?? modules[0]
  const expanded = modules.some(section => section.id === openId && sessionsOf(section).length > 0) ? openId : null
  const { nodes, edges, branchIds } = useMemo(() => buildTree(modules, module?.id ?? '', expanded, select, id => {
    select(id)
    setOpenId(current => current === id ? null : id)
  }), [modules, module?.id, expanded])

  return <div className="skill-page">
    <div className="page-heading">
      <div><p className="eyebrow">SPRING SECURITY ROADMAP</p><h1>Skill tree.</h1>
        <p className="subtitle">Explore the curriculum and see your saved progress across modules.</p></div>
      <Link className="secondary-button" to="/roadmap">Open roadmap list <ArrowRight size={16} /></Link>
    </div>
    {query.isPending && <p className="empty-state" role="status">Loading your skill tree…</p>}
    {query.isError && <div className="empty-state"><h2>Skill tree unavailable</h2><p role="alert">{query.error.message}</p>
      <button className="secondary-button" onClick={() => void query.refetch()}>Retry loading curriculum</button></div>}
    {query.isSuccess && !module && <p className="empty-state">This curriculum has no modules yet.</p>}
    {query.isSuccess && module && <div className="skill-workspace">
      <section className="skill-map" aria-label="Curriculum graph">
        <header className="skill-map-header">
          <div><h2><Network size={19} aria-hidden="true" /> Module map</h2>
            <p>{modules.length} modules · Select a module for details or use + to reveal its sessions.</p></div>
          <button className="secondary-button" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? 'Refreshing…' : 'Refresh progress'}
          </button>
        </header>
        <div className="skill-legend" aria-label="Map legend">
          <span><i />Curriculum order</span><span><i />Module’s sessions</span><span><i />Completed trail</span>
        </div>
        <div className="skill-canvas">
          <ReactFlow key={query.data.revisionId} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} className="dark"
            fitView fitViewOptions={fitOptions} minZoom={0.12} maxZoom={1.6}
            nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false}
            elementsSelectable={false} zoomOnScroll={false} zoomOnDoubleClick={false}
            aria-label="Interactive module map">
            <Background gap={24} />
            <Controls position="bottom-left" showInteractive={false} fitViewOptions={fitOptions} />
            <BranchCamera expanded={expanded} ids={branchIds} />
          </ReactFlow>
        </div>
        <details className="skill-list">
          <summary>Browse modules as a list</summary>
          <ol>{modules.map(section => <li key={section.id}>
            <button type="button" className="secondary-button" aria-pressed={section.id === module.id} onClick={() => {
              select(section.id)
              document.getElementById('skill-detail-heading')?.focus()
            }}>{section.title} <span>{section.statistics.sessionTopics.percentage}%</span></button>
          </li>)}</ol>
        </details>
      </section>
      <ModuleDetail section={module} />
    </div>}
  </div>
}

function ModuleDetail({ section }: { section: Section }) {
  const { sessionTopics, moduleRequirements } = section.statistics
  const sessions = sessionsOf(section)
  return <section className="skill-detail" aria-labelledby="skill-detail-heading">
    <p className="eyebrow">SELECTED MODULE</p>
    <h2 id="skill-detail-heading" tabIndex={-1} aria-live="polite">{section.title}</h2>
    <div className="skill-detail-stat"><strong>{sessionTopics.percentage}%</strong>
      <span>{sessionTopics.completed} / {sessionTopics.total} session topics completed</span></div>
    <p>{sessionTopics.inProgress} in progress · {sessionTopics.needsReview} need review</p>
    <p>Module requirements: {moduleRequirements.total
      ? `${moduleRequirements.completed} / ${moduleRequirements.total} completed`
      : 'None in this module'}</p>
    <h3>Sessions ({sessions.length})</h3>
    {sessions.length === 0 && <p>No sessions in this module.</p>}
    <ul className="skill-sessions">{sessions.map(session => <li key={session.id}>
      <Link to={`/roadmap/sessions/${session.id}`}>
        <span>{session.title}<small>{session.statistics.sessionTopics.completed} / {session.statistics.sessionTopics.total} topics completed</small></span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </li>)}</ul>
    <Link className="secondary-button" to={`/roadmap/modules/${section.id}`}>Open module in roadmap <ArrowRight size={16} /></Link>
  </section>
}
