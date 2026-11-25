import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronRight, Flag, Layers, Lightbulb, ListTree, LockKeyhole, MessageCircle, ShieldAlert, Target } from 'lucide-react'
import { ApiError } from '../curriculum/api'
import { getAssessmentCatalog, getLesson, type FlowCase, type Outcome, type ReadingSection, type Span } from './api'
import { OutcomeCards, ReadingPractice, RequestFlow } from './ReadingActivities'
import { CodeSample } from './CodeSample'
import './reading.css'

export function ReadingPage() {
  const { sessionId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const fromTopic = location.state?.fromTopic
  const checklist = `/roadmap/sessions/${encodeURIComponent(sessionId)}` +
    (typeof fromTopic === 'string' ? '#topic-' + encodeURIComponent(fromTopic) : '')
  const query = useQuery({
    queryKey: ['learning', 'lesson', sessionId],
    queryFn: () => getLesson(sessionId),
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

  const { session, sections, release, cases, outcomes, request, transport } = query.data
  const index = Math.max(0, sections.findIndex(section => section.anchor === visibleAnchor))
  const current = sections[index]
  const [sessionNumber, title] = session.title.split(' — ', 2)
  return <div className="reading-page">
    <nav className="rd-crumbs" aria-label="Breadcrumb">
      <Link to="/roadmap">Roadmap</Link><ChevronRight size={13} />
      <Link to={`/roadmap/modules/${session.moduleId}`}>{session.moduleTitle.split(' — ')[0]}</Link><ChevronRight size={13} />
      <Link to={checklist}>{sessionNumber}</Link><ChevronRight size={13} /><span aria-current="page">Reading</span>
    </nav>
    <header className="rd-hero">
      <div><div className="rd-kicker"><BookOpen size={16}/> Reading workspace</div>
        <h1 id="reading-title" tabIndex={-1}>{title ?? session.title}</h1>
        <p>{session.moduleTitle.split(' — ').at(-1)} <span> / </span> {sessionNumber}</p>
      </div>
      <div className="rd-endpoint"><LockKeyhole size={19}/><div><small>{transport}</small><code>{request}</code></div></div>
    </header>
    <div className="rd-layout">
      <aside className="rd-rail">
        <nav aria-label="Lesson path" className="rd-path">
          <h2><ListTree size={17}/> Lesson path</h2>
          <ol>{sections.map((section, i) => <li key={section.anchor}>
            <Link to={{ hash: '#' + section.anchor }} state={location.state} aria-label={section.title} aria-current={index === i ? 'step' : undefined}>
              <span className="rd-node" aria-hidden="true">{i + 1}</span>{section.title}
            </Link>
          </li>)}</ol>
          <label className="rd-mobile-path"><span className="sr-only">Choose a section</span>
            <select value={current.anchor} onChange={e => void navigate({hash: '#' + e.target.value}, {state: location.state})}>
              {sections.map((section, i) => <option value={section.anchor} key={section.anchor}>{i + 1}. {section.title}</option>)}
            </select><ChevronDown size={16} aria-hidden="true"/>
          </label>
        </nav>
        <div className="rd-goals" key={current.anchor}><h2><Target size={17}/> Learning objectives</h2>
          <ul>{current.objectives.map(goal => <li key={goal}>{goal}</li>)}</ul>
        </div>
        <Link className="rd-back" to={checklist}><ArrowLeft size={16}/> Back to checklist</Link>
      </aside>
      <article className="rd-article" aria-label={session.title}>
        {anchor && !target && <p role="status">This bookmark is unavailable. Showing the first section.</p>}
        {sections.map((section, i) => <LessonSection key={session.id + ':' + release + ':' + section.anchor}
          section={section} number={i + 1} total={sections.length} cases={cases} outcomes={outcomes} request={request}/>)}
        <section className="rd-ending" aria-labelledby="reading-next">
          <h2 id="reading-next">From reading to practice</h2>
          <p>Try explaining these decisions from memory. Then revisit the passage where your explanation needs more evidence.</p>
          <ul>{[...new Set(sections.flatMap(section => section.objectives))].map(goal => <li key={goal}>{goal}</li>)}</ul>
          <p>{Array.isArray(assessments.data) && assessments.data.includes(session.id) && <>Try the <Link to={`/learn/${session.id}/assessment`}>practice assessment</Link> to explain and check your decisions. </>}In the upcoming Coding Lab you’ll verify the response contract.</p>
          <nav className="rd-turn" aria-label="After reading">
            <Link to={{ hash: '' }} state={location.state}>Back to top</Link>
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
  if (title === 'Implementation details' || title === 'Guided explanation') {
    const Icon = title === 'Implementation details' ? Layers : MessageCircle
    return <details className="rd-disclosure"><summary><Icon size={17}/>{title}<ChevronDown size={16}/></summary>
      <p><Inline spans={spans}/></p></details>
  }
  const warning = title === 'Security warning' || title === 'Common misconception'
  const Icon = warning ? ShieldAlert : title === 'Engineering tip' ? Lightbulb : Flag
  return <aside className={'rd-note ' + (warning ? 'caution' : 'insight')}><Icon size={19}/>
    <div><h3>{title}</h3><p><Inline spans={spans}/></p></div></aside>
}

function LessonSection({ section, number, total, cases, outcomes, request }: { number: number; total: number; section: ReadingSection; cases: FlowCase[]; outcomes: Outcome[]; request: string }) {
  return <section className="rd-chapter" aria-labelledby={section.anchor}>
    <div className="rd-section-meta">Section {number} / {total}</div>
    <h2 id={section.anchor} tabIndex={-1}>{section.title}</h2>
    {section.blocks.map((block, i) => {
      switch (block.kind) {
        case 'outcomes': return <OutcomeCards key={i} outcomes={outcomes}/>
        case 'request-flow': return <RequestFlow key={i} cases={cases} request={request}/>
        case 'practice': return section.practice && <ReadingPractice key={i} practice={section.practice}/>
        case 'evidence': return <table key={i} className="rd-evidence">
          <caption>Observed responses · hypothetical</caption>
          <thead><tr><th scope="col">Request</th><th scope="col">Status</th><th scope="col">WWW-Authenticate</th></tr></thead>
          <tbody>{section.observations?.map(row => <tr key={row.request}>
            <th scope="row">{row.request}</th><td>{row.status}</td>
            <td className={row.challenge ? 'present' : 'missing'}>{row.challenge ?? 'Header absent'}</td>
          </tr>)}</tbody>
        </table>
        case 'note': return <TeachingNote key={i} title={block.text!} spans={block.spans}/>
        case 'code': return <CodeSample key={i} language={block.language!} text={block.text!}/>
        case 'passage': return <h3 key={i} className="rd-passage" id={block.text!} tabIndex={-1}><Inline spans={block.spans}/></h3>
        case 'heading': return <h3 key={i}><Inline spans={block.spans}/></h3>
        case 'paragraph': return <p key={i}><Inline spans={block.spans}/></p>
      }
    })}
  </section>
}
