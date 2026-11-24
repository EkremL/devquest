import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Check, ChevronRight, Flag, Layers3, RefreshCw } from 'lucide-react'
import { ApiError, getCurriculum, statusLabels, updateProgress, type Item, type ProgressStatus, type Section, type Statistics, type Stats } from './api'
import './roadmap.css'
import { getLessonCatalog, getTopicLinks } from '../learning/api'

export function RoadmapPage() {
  const { moduleId, sessionId } = useParams()
  const location = useLocation()
  const query = useQuery({ queryKey: ['curriculum'], queryFn: getCurriculum })
  const catalog = useQuery({
    queryKey: ['learning', 'catalog', query.data?.revisionId],
    queryFn: getLessonCatalog,
    enabled: !!sessionId && query.isSuccess,
  })
  const authored = !!sessionId && Array.isArray(catalog.data) && catalog.data.includes(sessionId)
  const topicLinks = useQuery({
    queryKey: ['learning', 'topics', query.data?.revisionId, sessionId],
    queryFn: () => getTopicLinks(sessionId!),
    enabled: authored,
  })
  useEffect(() => {
    if (!query.isSuccess || !location.hash.startsWith('#topic-')) return
    const frame = requestAnimationFrame(() => {
      const topic = document.getElementById(location.hash.slice(1))
      topic?.focus({ preventScroll: true })
      topic?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [query.isSuccess, location.key, location.hash])
  if (query.isPending) return <div className="empty-state" role="status"><RefreshCw className="refreshing" /> Loading your learning roadmap…</div>
  if (query.isError) return <div className="empty-state"><h1>Roadmap unavailable</h1><p role="alert">{query.error.message}</p><button className="secondary-button" onClick={() => void query.refetch()}>Retry loading roadmap</button></div>
  const root = query.data.root
  const modules = root.children.filter(node => node.kind === 'MODULE')
  const competencies = root.children.find(node => node.kind === 'FINAL_COMPETENCIES')!
  const session = modules.flatMap(module => module.children).find(node => node.id === sessionId && node.kind === 'SESSION')
  const module = modules.find(node => node.id === (moduleId ?? session?.parentId))
  const isFinal = location.pathname.endsWith('/competencies')
  if ((moduleId && !module) || (sessionId && !session)) return <div className="empty-state"><h1>Section not found</h1><Link to="/roadmap">Return to roadmap</Link></div>
  const section = session ?? module ?? (isFinal ? competencies : root)
  return <div className="roadmap-page">
    <nav className="roadmap-breadcrumb" aria-label="Breadcrumb">
      <Link to="/roadmap">Roadmap</Link>
      {module && <><ChevronRight size={14} /><Link to={`/roadmap/modules/${module.id}`}>{module.title.split(' — ')[0]}</Link></>}
      {(session || isFinal) && <><ChevronRight size={14} /><span aria-current="page">{session ? session.title.split(' — ')[0] : 'Final competencies'}</span></>}
    </nav>
    <div className="page-heading"><div><p className="eyebrow">LEARN WITH INTENTION</p><h1>{section === root ? 'Your learning roadmap.' : section.title}</h1><p className="subtitle">{section === root ? 'From first principles to production security. One deliberate step at a time.' : session ? 'Explore the session topics and save your self-reported progress as you go.' : isFinal ? 'Reflect on the skills you can demonstrate across the entire curriculum.' : 'Explore your sessions and track module requirements separately.'}</p></div><span className="milestone-badge">M1 <span>Interactive roadmap</span></span></div>
    {session && authored && <Link className="primary-button roadmap-reading-link" to={`/learn/${session.id}/read`}><BookOpen size={18} aria-hidden="true" />Read lesson</Link>}
    <StatisticsCards statistics={section.statistics} compact={!!session || isFinal} finalOnly={isFinal} />
    {section === root && <>
      <div className="section-heading roadmap-section-heading"><div><h2><Layers3 size={19} /> Learning modules</h2><p>{modules.length} modules · {modules.reduce((n, m) => n + m.children.filter(c => c.kind === 'SESSION').length, 0)} sessions · Original curriculum order</p></div><Link className="secondary-button" to="/roadmap/competencies"><Flag size={15} />Final competencies</Link></div>
      <div className="module-grid">{modules.map(node => <ModuleCard key={node.id} section={node} />)}</div>
      <div className="curriculum-note"><BookOpen size={19} /><p>Completion reflects your own learning evidence. Module requirements and final competencies are independent checklists; completing a session never checks them automatically.</p></div>
    </>}
    {module && !session && <>
      <div className="section-heading roadmap-section-heading"><div><h2>Sessions</h2><p>Follow the original sequence or revisit any session.</p></div></div>
      <div className="session-list">{module.children.filter(c => c.kind === 'SESSION').map(node => <Link className="session-card" to={`/roadmap/sessions/${node.id}`} key={node.id}><div><h3>{node.title}</h3><ProgressMeter stats={node.statistics.sessionTopics} label="Session topics" /></div><ArrowRight size={20} /></Link>)}</div>
      {module.children.filter(c => c.kind === 'MODULE_COMPLETION').map(node => <section className="requirements-section" key={node.id}><h2>{node.title}</h2><p className="subtitle">Separate evidence for finishing this module. These items are never inferred from session progress.</p><Checklist key={node.id} items={node.items} /></section>)}
      {!module.children.some(c => c.kind === 'MODULE_COMPLETION') && <p className="curriculum-note">The source roadmap defines no separate completion requirements for this module.</p>}
    </>}
    {(session || isFinal) && <section className="topic-section" aria-label={session ? 'Session topics' : 'Final competencies'}><Checklist key={section.id} items={section.items} sessionId={session?.id} passages={authored ? topicLinks.data : undefined}
      availability={catalog.isError || topicLinks.isError ? 'Could not check reading availability' : catalog.isPending || (authored && topicLinks.isPending) ? 'Checking lesson availability…' : 'Reading not yet available'} /></section>}
    <footer><span>DevQuest / Progress grounded in real work.</span><span>Saved locally in PostgreSQL</span></footer>
  </div>
}

function StatisticsCards({ statistics, compact, finalOnly }: { statistics: Statistics; compact: boolean; finalOnly: boolean }) {
  const groups: [string, Stats][] = finalOnly ? [['Final competencies', statistics.finalCompetencies]] : compact ? [['Session topics', statistics.sessionTopics]] : [['Session topics', statistics.sessionTopics], ['Module requirements', statistics.moduleRequirements], ['Final competencies', statistics.finalCompetencies]]
  return <section className={`roadmap-stats ${compact ? 'compact' : ''}`} aria-label="Completion statistics">{groups.filter(([, stats]) => stats.total > 0).map(([label, stats]) => <article key={label} className="progress-summary"><p className="eyebrow">{label}</p><div className="stat-value">{stats.completed}<span> / {stats.total}</span><span className="stat-percentage">{stats.percentage}%</span></div><ProgressMeter stats={stats} label={label} hideCount /><p className="stat-caption">{stats.inProgress} in progress · {stats.needsReview} need review</p></article>)}</section>
}
function ProgressMeter({ stats, label, hideCount = false }: { stats: Stats; label: string; hideCount?: boolean }) {
  return <div className="progress-meter">{!hideCount && <div className="progress-caption"><span>{label}: {stats.completed} / {stats.total} completed</span><strong>{stats.percentage}%</strong></div>}<div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={stats.total || 1} aria-valuenow={stats.completed} aria-valuetext={`${stats.completed} of ${stats.total} completed`}><div style={{ width: `${stats.percentage}%` }} /></div></div>
}
function ModuleCard({ section }: { section: Section }) {
  const topics = section.statistics.sessionTopics
  const requirements = section.statistics.moduleRequirements
  const [number, title] = section.title.split(' — ')
  return <article className="module-card"><div className="module-card-top"><span className="module-number">{number}</span><span className={`progress-status status-${topics.state.toLowerCase()}`}>{statusLabels[topics.state]}</span></div><h2><Link to={`/roadmap/modules/${section.id}`}>{title}</Link></h2><p className="module-meta">{section.children.filter(c => c.kind === 'SESSION').length} sessions · {topics.total + requirements.total} checklist items</p><ProgressMeter stats={topics} label="Session topics" /><p className="requirements-count">Module requirements: {requirements.total ? `${requirements.completed} / ${requirements.total} completed` : 'None in source'}</p><Link className="module-link" to={`/roadmap/modules/${section.id}`} aria-label={`Open ${number}: ${title}`}>Explore module<ArrowRight size={16} /></Link></article>
}
function Checklist({ items, sessionId, passages, availability }: { items: Item[]; sessionId?: string; passages?: Record<string, string>; availability?: string }) {
  return <ol className="topic-list">{items.map(item => <TopicRow key={item.id} item={item}
    availability={sessionId ? availability : undefined}
    studyLink={sessionId && passages?.[item.id] ? `/learn/${sessionId}/read#${passages[item.id]}` : undefined} />)}</ol>
}
function TopicRow({ item, studyLink, availability }: { item: Item; studyLink?: string; availability?: string }) {
  const client = useQueryClient()
  const [selected, setSelected] = useState(item.progress.status)
  const [feedback, setFeedback] = useState('')
  useEffect(() => { setSelected(item.progress.status) }, [item.progress.status, item.progress.version])
  const mutation = useMutation({
    mutationFn: () => updateProgress(item, selected),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['curriculum'] })
      setFeedback('Saved to PostgreSQL.')
    },
    onError: async error => {
      // A timeout may occur after commit. Refetch before the next user decision.
      await client.invalidateQueries({ queryKey: ['curriculum'] })
      setFeedback(error instanceof ApiError && error.status === 409 ? 'Conflict: latest progress loaded. Review the status and choose again.' : `${error.message} Reload the latest status before retrying if needed.`)
    },
  })
  const title = availability ? item.label.replaceAll('`', '') : item.label
  const savedStatus = item.progress.status
  const dirty = selected !== savedStatus
  const destination = { to: studyLink ?? '', state: { fromTopic: item.id } }
  const badge = <span className="progress-status">{savedStatus === 'COMPLETED' && <Check size={13} aria-hidden="true" />}{statusLabels[savedStatus]}</span>
  const message = mutation.isPending ? 'Saving progress…' : feedback || (dirty ? 'Unsaved changes' : '')
  return <li className={`topic-row status-${savedStatus.toLowerCase()}${availability ? ' learning-topic' : ''}${studyLink ? ' has-passage' : ''}`} id={`topic-${item.id}`} tabIndex={-1}>
    {availability ? <>
      <div className="topic-meta"><span>Topic {String(item.position + 1).padStart(2, '0')}</span>{badge}</div>
      <div className="topic-learning">
        <h2>{studyLink
          ? <Link className="topic-title" {...destination}>{title}</Link>
          : <a className="topic-title" href={`#topic-${item.id}`}>{title}</a>}</h2>
        {studyLink
          ? <Link className="topic-study" aria-label={`Study topic: ${title}`} {...destination}><BookOpen size={16} aria-hidden="true" />Study topic<ArrowRight size={15} aria-hidden="true" /></Link>
          : <span className="topic-availability">{availability}</span>}
      </div>
    </> : <div className="topic-content"><span className="topic-order">{item.position + 1}</span><div><a className="topic-title" href={`#topic-${item.id}`}>{title}</a>{badge}</div></div>}
    <div className="topic-actions">
      <label className={availability ? 'topic-progress-label' : 'sr-only'} htmlFor={`status-${item.id}`}>
        {availability && <>Self-reported progress<span className="sr-only"> · </span></>}
        <span className={availability ? 'sr-only' : undefined}>Status for {title}</span>
      </label>
      <select id={`status-${item.id}`} value={selected} disabled={mutation.isPending} onChange={e => { setSelected(e.target.value as ProgressStatus); setFeedback(''); mutation.reset() }}>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" className="secondary-button" disabled={mutation.isPending || !dirty} onClick={() => { setFeedback(''); mutation.mutate() }} aria-label={`Save progress for ${title}`}>{mutation.isPending ? 'Saving…' : 'Save'}</button>
    </div>
    {message && <p className={`save-feedback ${mutation.isError ? 'save-error' : dirty && !mutation.isPending ? 'save-draft' : ''}`} role={mutation.isError ? 'alert' : 'status'}>{message}</p>}
  </li>
}
