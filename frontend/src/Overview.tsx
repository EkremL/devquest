import { useMemo } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight, BookOpen, ChevronRight, Compass, Layers3, Network, RefreshCw, Target } from 'lucide-react'
import { getCurriculum, getRecentActivity, statusLabels, type ActivityEntry, type Stats } from './features/curriculum/api'
import { sessionPath, summarize, type TopicContext } from './features/dashboard/model'
import { WorkspaceConnection } from './features/dashboard/WorkspaceConnection'
import './features/dashboard/dashboard.css'

export function Overview() {
  const curriculum = useQuery({ queryKey: ['curriculum'], queryFn: getCurriculum, refetchOnMount: 'always' })
  const root = curriculum.data?.root
  const revision = curriculum.data?.revisionId
  const activity = useQuery({
    queryKey: ['learning-activity', revision], queryFn: getRecentActivity, enabled: !!revision, refetchOnMount: 'always',
  })
  const dashboard = useMemo(() => root ? summarize(root) : undefined, [root])
  const busy = curriculum.isFetching || activity.isFetching

  function refresh() {
    void curriculum.refetch()
    if (revision) void activity.refetch()
  }

  return <div className="learning-dashboard">
    <header className="page-heading">
      <div><p className="eyebrow">YOUR LEARNING WORKSPACE</p><h1>Learning dashboard.</h1><p className="subtitle">Track your Spring Security progress and choose what to work on next.</p></div>
      <button className="secondary-button dashboard-refresh" aria-disabled={busy} onClick={() => { if (!busy) refresh() }}>
        <RefreshCw size={16} aria-hidden="true" /> {busy ? 'Refreshing…' : 'Refresh dashboard'}
      </button>
    </header>

    {curriculum.isPending && <p className="empty-state" role="status">Loading learning progress…</p>}
    {curriculum.isError && <div className="empty-state">
      <p role="alert">{curriculum.error.message}{root ? ' Showing the last loaded progress.' : ''}</p>
      <button className="secondary-button" onClick={refresh}>Retry loading dashboard</button>
    </div>}
    {root && dashboard && <>
      <LearningStats count={dashboard.modules.length} sessions={dashboard.sessionCount} statistics={root.statistics} />
      <ContinueLearning topic={dashboard.recommendation} hasTopics={root.statistics.sessionTopics.total > 0} />
      <section aria-labelledby="dashboard-modules" className="dashboard-section">
        <div className="dashboard-section-heading"><div><h2 id="dashboard-modules">Module progress</h2><p>Completion tracks session topics within each module.</p></div>
          <Link className="secondary-button" to="/skill-tree"><Network size={17} />Explore Skill Atlas</Link></div>
        {dashboard.modules.length === 0 && <p className="dashboard-empty">No modules are available in the current curriculum.</p>}
        <div className="dashboard-modules">{dashboard.modules.map(module => {
          const stats = module.statistics.sessionTopics
          return <Link key={module.id} className="dashboard-module" to={`/roadmap/modules/${module.id}`}>
            <div className="dashboard-module-top"><span className={`dashboard-state state-${stats.state}`}>{statusLabels[stats.state]}</span><ArrowRight size={16} aria-hidden="true" /></div>
            <h3>{module.title}</h3>
            <div className="dashboard-module-stats"><span>{stats.completed} / {stats.total} topics</span><b>{stats.percentage}%</b></div>
            <Meter value={stats.percentage} />
          </Link>
        })}</div>
      </section>
      <div className="dashboard-lower">
        <section className="dashboard-panel" aria-labelledby="dashboard-focus">
          <h2 id="dashboard-focus"><Target size={19} aria-hidden="true" />Learning focus</h2>
          {dashboard.recommendation && <div className="focus-remaining">
            <Link to={`/roadmap/modules/${dashboard.recommendation.module.id}`}>{dashboard.recommendation.module.title}</Link>
            <p>{remaining(dashboard.recommendation.module.statistics.sessionTopics)} session topics remaining in the suggested module.</p>
          </div>}
          <FocusList label="In progress" topics={dashboard.inProgress} />
          <FocusList label="Needs review" topics={dashboard.review} />
        </section>
        <section className="dashboard-panel" aria-labelledby="dashboard-activity">
          <h2 id="dashboard-activity"><Activity size={19} aria-hidden="true" />Recent activity</h2>
          {activity.isPending && <p role="status">Loading recorded activity…</p>}
          {activity.isError && <p role="alert">{activity.error.message}{activity.data ? ' Showing the last loaded activity.' : ''}</p>}
          {activity.data?.length === 0 && <div className="dashboard-empty activity-empty"><Activity size={23} aria-hidden="true" />
            <h3>No recorded activity yet</h3><p>Saved status changes appear here. Completions imported from Markdown count toward progress.</p></div>}
          {!!activity.data?.length && <ol className="activity-list">{activity.data.map(event => <li key={event.id}><ActivityRow event={event} /></li>)}</ol>}
        </section>
      </div>
    </>}
    <WorkspaceConnection />
  </div>
}

function remaining(stats: Stats) { return stats.total - stats.completed }
function Meter({ value }: { value: number }) {
  return <div className="dashboard-meter" aria-hidden="true"><span style={{ width: `${value}%` }} /></div>
}

function LearningStats({ count, sessions, statistics }: { count: number; sessions: number; statistics: { sessionTopics: Stats; moduleRequirements: Stats; finalCompetencies: Stats } }) {
  const { sessionTopics: topics, moduleRequirements: requirements, finalCompetencies: competencies } = statistics
  const tiles = [
    ['Modules', count], ['Sessions', sessions], ['Session topics', topics.total],
    ['Completed topics', topics.completed], ['In-progress topics', topics.inProgress], ['Needs-review topics', topics.needsReview],
  ] as const
  return <section className="dashboard-summary" aria-labelledby="dashboard-stats">
    <h2 id="dashboard-stats"><Layers3 size={18} aria-hidden="true" />Learning statistics</h2>
    <dl className="dashboard-tiles">{tiles.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="dashboard-breakdown">
      <div className="dashboard-overall"><span>Overall session-topic completion</span><strong>{topics.percentage}%</strong><Meter value={topics.percentage} /></div>
      <div><span>Module requirements</span><strong>{requirements.completed} / {requirements.total}</strong></div>
      <div><span>Final competencies</span><strong>{competencies.completed} / {competencies.total}</strong></div>
    </div>
  </section>
}

function ContinueLearning({ topic, hasTopics }: { topic?: TopicContext; hasTopics: boolean }) {
  const reason = topic?.item.progress.status === 'IN_PROGRESS' ? 'In-progress topic'
    : topic?.item.progress.status === 'NEEDS_REVIEW' ? 'Review suggested' : 'Next incomplete topic'
  return <section className="dashboard-continue" aria-labelledby="dashboard-continue">
    <div className="continue-icon"><Compass size={26} aria-hidden="true" /></div>
    <div><h2 id="dashboard-continue">Continue learning</h2>
      {topic ? <><p className="continue-reason">{reason} · Suggested from saved progress</p><h3>{topic.item.label}</h3><p>{topic.session.title}</p></>
        : <p>{hasTopics ? 'All session topics are complete. You can revisit any session or check the remaining requirements and final competencies separately.' : 'The current curriculum has no session topics yet.'}</p>}
    </div>
    <Link className="primary-button" to={topic ? sessionPath(topic.session.id) : '/roadmap'}>{topic ? 'Open suggested session' : 'Browse Roadmap'}<ArrowRight size={17} aria-hidden="true" /></Link>
  </section>
}

function FocusList({ label, topics }: { label: string; topics: TopicContext[] }) {
  const topicLink = ({ item, session }: TopicContext) => <li key={item.id}><Link to={sessionPath(session.id)}><BookOpen size={15} aria-hidden="true" /><span><strong>{item.label}</strong><small>{session.title}</small></span><ChevronRight size={15} aria-hidden="true" /></Link></li>
  return <div className="focus-list"><h3>{label} <span>{topics.length}</span></h3>
    {topics.length === 0 ? <p>No topics {label === 'In progress' ? 'in progress' : 'marked for review'}.</p>
      : <ul>{topics.slice(0, 5).map(topicLink)}</ul>}
    {topics.length > 5 && <details><summary>Show {topics.length - 5} more · {label}</summary><ul>{topics.slice(5).map(topicLink)}</ul></details>}
  </div>
}

const activityDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
function ActivityRow({ event }: { event: ActivityEntry }) {
  const href = event.sectionKind === 'SESSION' ? sessionPath(event.sectionId)
    : event.sectionKind === 'MODULE_COMPLETION' && event.moduleId ? `/roadmap/modules/${event.moduleId}`
    : event.sectionKind === 'FINAL_COMPETENCIES' ? '/roadmap/competencies' : '/roadmap'
  return <Link to={href} className="activity-entry">
    <strong>{event.topic}</strong>
    <span>{statusLabels[event.fromStatus]} → {statusLabels[event.toStatus]}</span>
    <small>{event.sectionTitle}</small>
    <time dateTime={event.occurredAt}>{activityDate.format(new Date(event.occurredAt))}</time>
  </Link>
}
