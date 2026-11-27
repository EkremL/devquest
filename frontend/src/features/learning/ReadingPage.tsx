import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Flag, FlaskConical, Layers, Lightbulb, ListTree, LockKeyhole, MessageCircle, ShieldAlert, Target } from 'lucide-react'
import { ApiError } from '../curriculum/api'
import { getAssessmentCatalog, getLesson, type FlowCase, type Lesson, type Outcome, type ReadingSection, type Span } from './api'
import { InstructionFigure, OutcomeCards, ReadingPractice, RequestFlow } from './ReadingActivities'
import { CodeSample } from './CodeSample'
import { SecurityDecisionPlayground } from './SecurityDecisionPlayground'
import { MissionActivity, PolicyWalkthrough } from './MissionActivities'
import { MissionProgress } from './MissionPrimitives'
import { isMissionId, type MissionId, type MissionState, type ReportActivity } from './missionIds'
import { labForLesson } from './labs/catalog'
import './reading.css'

export function ReadingPage() {
  const { sessionId = '' } = useParams()
  const location = useLocation()
  const requestedRelease = new URLSearchParams(location.search).get('release')
  const fromTopic = location.state?.fromTopic
  const checklist = `/roadmap/sessions/${encodeURIComponent(sessionId)}` +
    (typeof fromTopic === 'string' ? '#topic-' + encodeURIComponent(fromTopic) : '')
  const query = useQuery({
    queryKey: requestedRelease === null ? ['learning', 'lesson', sessionId] : ['learning', 'lesson', sessionId, requestedRelease],
    queryFn: () => getLesson(sessionId, requestedRelease),
    retry: false,
  })
  const anchor = location.hash.slice(1)
  const assessments = useQuery({ queryKey: ['learning','assessment-catalog'], queryFn: getAssessmentCatalog })
  const chapters = query.data?.sections
  const target = chapters?.some(s => s.anchor === anchor ||
    s.blocks.some(b => b.kind === 'passage' && b.text === anchor)) ? anchor : undefined
  const [visibleAnchor, setVisibleAnchor] = useState('')

  // Only deliberate navigation moves focus or scrolls. Tracking the viewport never writes history.
  useEffect(() => {
    if (!chapters) return
    const frame = requestAnimationFrame(() => {
      const heading = target && document.getElementById(target)
      if (heading) {
        heading.focus({ preventScroll: true })
        heading.scrollIntoView?.({ block: 'start', behavior: 'instant' })
      } else {
        document.getElementById('reading-title')?.focus({ preventScroll: true })
        window.scrollTo(0, 0)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [chapters, target, location.key])

  useEffect(() => {
    if (!chapters) return
    const headings = chapters.map(s => document.getElementById(s.anchor)).filter(h => h !== null)
    let frame = 0
    const measure = () => {
      frame = 0
      const first = headings[0]
      if (!first) return
      const offset = (parseFloat(getComputedStyle(first).scrollMarginTop) || 0) + 3
      const active = headings.filter(h => h.getBoundingClientRect().top <= offset).at(-1) ?? first
      setVisibleAnchor(active.id)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : undefined
    const article = headings[0]?.closest('article')
    if (article) observer?.observe(article)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [chapters])

  if (query.isPending) return <p className="empty-state" role="status">Loading lesson…</p>
  if (query.isError) {
    const missing = query.error instanceof ApiError && [400, 404].includes(query.error.status)
    return <section className="empty-state">
      <h1>Lesson unavailable</h1>
      <p role="alert">{missing ? 'There is no published reading for this session in the current curriculum.' : 'The reading could not be loaded. You can retry or return to the checklist.'}</p>
      {!missing && <button className="secondary-button" onClick={() => void query.refetch()}>Retry</button>}
      <Link to={checklist}>Back to checklist</Link>
    </section>
  }

  return <ReadingContent key={sessionId + ':' + query.data.release} lesson={query.data} checklist={checklist}
    visibleAnchor={visibleAnchor} missingAnchor={Boolean(anchor && !target)}
    hasAssessment={Array.isArray(assessments.data) && assessments.data.includes(sessionId)}/>
}

function ReadingContent({ lesson, checklist, visibleAnchor, missingAnchor, hasAssessment }: {
  lesson: Lesson; checklist: string; visibleAnchor: string; missingAnchor: boolean; hasAssessment: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activity, setActivity] = useState<Partial<Record<MissionId, MissionState>>>({})
  const [replay, setReplay] = useState(0)
  const { session, sections, release, cases, outcomes, request, transport } = lesson
  const lab = labForLesson(lesson.key)
  const index = Math.max(0, sections.findIndex(section => section.anchor === visibleAnchor))
  const current = sections[index]
  const [sessionNumber, title] = session.title.split(' — ', 2)
  const missions = sections.map(section => section.blocks.find(block => block.kind === 'mission')?.text ?? null)
  const states = missions.map(id => (isMissionId(id) ? activity[id] : undefined) ?? 'Not explored')
  const missionMode = missions.every(isMissionId) && missions.length > 0
  const completed = missionMode && states.every(state => state === 'Activity completed')
  const labStyle = missions[0] === 'build-export-grants' ? 'policy' : missions[0] === 'build-http-request' ? 'http' :
    missions[0] === 'follow-session-signin' ? 'sessions' : missions[0] === 'triage-security-request' ? 'spring-trace' :
      missions[0] === 'dispatch-token-pair' ? 'token-lifecycle' : missions[0] === 'inspect-jwt-envelope' ? 'jwt' : missions[0] === 'route-mechanism' ? 'mechanisms' : missions[0] === 'triage-auth-signals' ? 'threats' :
        missions[0] === 'cross-spring-boundary' ? 'spring-boundary' : missions[0] === 'follow-servlet-call' ? 'servlet-filters' :
          missions[0] === 'open-auth-context' ? 'security-context' : missions[0] === 'route-auth-provider' ? 'auth-providers' : undefined
  const missionIntro = labStyle === 'policy' ? 'Build, break and repair a workspace export policy' :
    labStyle === 'http' ? 'Construct requests, trace transport and diagnose responses' :
      labStyle === 'sessions' ? 'Operate a session from sign-in through expiration and logout' :
        labStyle === 'spring-trace' ? 'Trace Spring Security calls, repair responses and prepare for the Coding Lab' :
          labStyle === 'token-lifecycle' ? 'Trace token issuance, expiration and withdrawal' :
            labStyle === 'jwt' ? 'Inspect a JWT and defend the verifier’s trust decisions' : labStyle === 'mechanisms' ? 'Compare authentication designs against real operating requirements' : labStyle === 'threats' ? 'Classify incident evidence and verify authentication defenses' : labStyle === 'spring-boundary' ? 'Trace the path from the Spring Security boundary to domain policy' : labStyle === 'servlet-filters' ? 'Follow servlet calls, compare filter chains and diagnose an active trace' : labStyle === 'security-context' ? 'Inspect authentication objects and trace context through requests and tasks' : labStyle === 'auth-providers' ? 'Route evidence through providers and inspect the result' : 'Trace evidence, inspect a caller and decide access'

  function report(id: MissionId, done = false) {
    setActivity(previous => {
      const next = done ? 'Activity completed' : 'In progress'
      return previous[id] === next || previous[id] === 'Activity completed' ? previous : { ...previous, [id]: next }
    })
  }

  return <div className={'reading-page' + (missionMode ? ' mx-reader' : '')} data-lab={labStyle}>
    <nav className="rd-crumbs" aria-label="Breadcrumb">
      <Link to="/roadmap">Roadmap</Link><ChevronRight size={13} />
      <Link to={`/roadmap/modules/${session.moduleId}`}>{session.moduleTitle.split(' — ')[0]}</Link><ChevronRight size={13} />
      <Link to={checklist}>{sessionNumber}</Link><ChevronRight size={13} /><span aria-current="page">Reading</span>
    </nav>
    <header className="rd-hero">
      <div><div className="rd-kicker"><BookOpen size={16} aria-hidden="true"/> {missionMode ? 'Interactive reading · ' + sessionNumber : 'Reading workspace'}</div>
        <h1 id="reading-title" tabIndex={-1}>{title ?? session.title}</h1>
        <p>{missionMode ? `${missionIntro} across ${missions.length} hands-on missions.` :
          <>{session.moduleTitle.split(' — ').at(-1)} <span> / </span> {sessionNumber}</>}</p>
      </div>
      {request && transport && <div className="rd-endpoint"><LockKeyhole size={19}/><div><small>{transport}</small><code>{request}</code></div></div>}
    </header>
    <div className="rd-layout">
      <aside className="rd-rail">
        <nav aria-label="Lesson path" className="rd-path">
          <h2><ListTree size={17}/> Lesson path</h2>
          <ol>{sections.map((section, i) => <li key={section.anchor}>
            <Link to={{ search: location.search, hash: '#' + section.anchor }} state={location.state} aria-label={section.title}
              aria-describedby={missionMode ? 'activity-' + section.anchor : undefined} aria-current={index === i ? 'step' : undefined}>
              <span className="rd-node" aria-hidden="true">{missionMode && states[i] === 'Activity completed' ? <Check size={14}/> : i + 1}</span>{section.title}
              {missionMode && <small id={'activity-' + section.anchor} className="mx-path-state" data-state={states[i]}>{states[i]}</small>}
            </Link>
          </li>)}</ol>
          <label className="rd-mobile-path"><span className="sr-only">Choose a section</span>
            <select value={current.anchor} aria-describedby={missionMode ? 'current-mission-status' : undefined}
              onChange={e => void navigate({search: location.search, hash: '#' + e.target.value}, {state: location.state})}>
              {sections.map((section, i) => <option value={section.anchor} key={section.anchor}>{i + 1}. {section.title}{missionMode && states[i] === 'Activity completed' ? ' ✓' : ''}</option>)}
            </select><ChevronDown size={16} aria-hidden="true"/>
            {missionMode && <span className="sr-only" id="current-mission-status">{states[index]}</span>}
          </label>
        </nav>
        {missionMode && <MissionProgress states={states} onReplay={() => {
          setActivity({})
          setReplay(previous => previous + 1)
        }}/>}
        <div className="rd-goals" key={current.anchor}><h2><Target size={17}/> Learning objectives</h2>
          <ul>{current.objectives.map(goal => <li key={goal}>{goal}</li>)}</ul>
        </div>
        <Link className="rd-back" to={checklist}><ArrowLeft size={16}/> Back to checklist</Link>
      </aside>
      <article className="rd-article" aria-label={session.title}>
        {missingAnchor && <p role="status">This bookmark is unavailable. Showing the first section.</p>}
        {sections.map((section, i) => {
          const id = missions[i]
          return <LessonSection key={session.id + ':' + release + ':' + section.anchor + ':' + replay}
            section={section} number={i + 1} total={sections.length} cases={cases} outcomes={outcomes} request={request}
            mission={isMissionId(id) ? { id, state: states[i], report: done => report(id, done) } : undefined}/>
        })}
        <section className={'rd-ending' + (missionMode ? ' mx-ending' : '')} aria-labelledby="reading-next">
          <h2 id="reading-next">{completed ? 'All mission activities complete' : 'From reading to practice'}</h2>
          {missionMode ? <>
            <p>{completed ? `You completed ${missions.length} formative activities in this visit. Take the independent assessment to check your reasoning.` :
              'Continue with independent practice whenever you are ready.'}</p>
            {hasAssessment && <Link className="primary-button" to={`/learn/${session.id}/assessment`}>Practice assessment <ArrowRight size={16} aria-hidden="true"/></Link>}
          </> : <>
            <p>Try explaining these decisions from memory. Then revisit the passage where your explanation needs more evidence.</p>
            <ul>{[...new Set(sections.flatMap(section => section.objectives))].map(goal => <li key={goal}>{goal}</li>)}</ul>
            {hasAssessment && <p>Try the <Link to={`/learn/${session.id}/assessment`}>practice assessment</Link> to explain and check your decisions.</p>}
          </>}
          {lab && <Link className="secondary-button" to={`/learn/${session.id}/lab`}><FlaskConical size={16} aria-hidden="true"/>Open Coding Lab</Link>}
          <nav className="rd-turn" aria-label="After reading">
            <Link to={{ search: location.search, hash: '' }} state={location.state}>Back to top</Link>
            <Link className="rd-next" to={checklist}>Return to session checklist<ArrowRight size={16}/></Link>
          </nav>
        </section>
      </article>
    </div>
  </div>
}

function Inline({ spans }: { spans: Span[] }) {
  return spans.map((span, i) => {
    if (span.kind === 'code') return <code key={i}>{span.text}</code>
    if (span.kind === 'link' && span.href) return <a key={i} href={span.href}>{span.text}</a>
    return span.text
  })
}

function TeachingNote({ title, spans }: { title: string; spans: Span[] }) {
  if (title === 'Implementation details' || title === 'Guided explanation' || title === 'Going deeper') {
    const Icon = title === 'Guided explanation' ? MessageCircle : Layers
    return <details className="rd-disclosure"><summary><Icon size={17}/>{title}<ChevronDown size={16}/></summary>
      <p><Inline spans={spans}/></p></details>
  }
  const warning = title === 'Security warning' || title === 'Common misconception'
  const Icon = warning ? ShieldAlert : title === 'Engineering tip' ? Lightbulb : Flag
  return <aside className={'rd-note ' + (warning ? 'caution' : title === 'Debugger mindset' ? 'rd-debug-note' : 'insight')}><Icon size={19}/>
    <div><h3>{title}</h3><p><Inline spans={spans}/></p></div></aside>
}

function LessonSection({ section, number, total, cases, outcomes, request, mission }: {
  number: number; total: number; section: ReadingSection; cases: FlowCase[] | null; outcomes: Outcome[] | null; request: string | null
  mission?: { id: MissionId; state: MissionState; report: ReportActivity }
}) {
  return <section className="rd-chapter" aria-labelledby={section.anchor}>
    <div className="rd-section-meta">{mission ? 'Mission' : 'Section'} {number} / {total}
      {mission && <span className="mx-mission-state" data-state={mission.state}>{mission.state}</span>}</div>
    <h2 id={section.anchor} tabIndex={-1}>{section.title}</h2>
    {section.blocks.map((block, i) => {
      switch (block.kind) {
        case 'outcomes': return outcomes && <OutcomeCards key={i} outcomes={outcomes}/>
        case 'request-flow': return cases && request && <RequestFlow key={i} cases={cases} request={request}/>
        case 'practice': return section.practice && <ReadingPractice key={i} practice={section.practice}/>
        case 'security-decision': return <SecurityDecisionPlayground key={i}/>
        case 'mission': return mission && <MissionActivity key={i} id={mission.id} report={mission.report}/>
        case 'visual': return block.visual && <InstructionFigure key={i} visual={block.visual}/>
        case 'evidence': return <table key={i} className="rd-evidence">
          <caption>Observed responses · hypothetical</caption>
          <thead><tr><th scope="col">Request</th><th scope="col">Status</th><th scope="col">WWW-Authenticate</th></tr></thead>
          <tbody>{section.observations?.map(row => <tr key={row.request}>
            <th scope="row">{row.request}</th><td>{row.status}</td>
            <td className={row.challenge ? 'present' : 'missing'}>{row.challenge ?? 'Header absent'}</td>
          </tr>)}</tbody>
        </table>
        case 'note': return <TeachingNote key={i} title={block.text!} spans={block.spans}/>
        case 'code': return mission?.id === 'decide-access' && block.language === 'java'
          ? <PolicyWalkthrough key={i} text={block.text!}/>
          : <CodeSample key={i} language={block.language!} text={block.text!} wrap={!request}/>
        case 'passage': return <h3 key={i} className="rd-passage" id={block.text!} tabIndex={-1}><Inline spans={block.spans}/></h3>
        case 'heading': return <h3 key={i}><Inline spans={block.spans}/></h3>
        case 'paragraph': return <p key={i}><Inline spans={block.spans}/></p>
      }
    })}
  </section>
}
