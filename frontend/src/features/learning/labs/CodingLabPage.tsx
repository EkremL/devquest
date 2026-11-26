import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, ClipboardList, Copy, Download, FlaskConical } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { labForLesson, useLabSession } from './catalog'
import '../reading.css'
import './lab.css'

export function CodingLabPage() {
  const { sessionId = '' } = useParams()
  const query = useLabSession(sessionId)
  const lab = query.data && labForLesson(query.data.key)
  const heading = useRef<HTMLHeadingElement>(null)
  const session = encodeURIComponent(sessionId)
  const workspace = '/learn/' + session
  const checklist = '/roadmap/sessions/' + session

  useEffect(() => {
    if (!lab) return
    const frame = requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [lab, sessionId])

  if (query.isPending) return <p className="empty-state" role="status">Loading Coding Lab…</p>
  if (!lab) return <section className="empty-state">
    <h1>Coding Lab unavailable</h1>
    <p>{query.isError ? 'The session could not be loaded.' : 'There is no published lab for this session.'}</p>
    <Link className="secondary-button" to={checklist}>Return to session checklist</Link>
  </section>

  return <div className="reading-page coding-lab">
    <nav className="lab-links" aria-label="Session workspaces">
      <Link className="secondary-button" to={checklist}><ArrowLeft size={16} aria-hidden="true"/>Session checklist</Link>
      <Link className="secondary-button" to={workspace+'/read'}><BookOpen size={16} aria-hidden="true"/>Reading</Link>
      <Link className="secondary-button" to={workspace+'/assessment'}><ClipboardList size={16} aria-hidden="true"/>Assessment</Link>
    </nav>
    <header className="rd-hero">
      <div><p className="rd-kicker"><FlaskConical size={17} aria-hidden="true"/> Coding Lab · Release {lab.release}</p>
        <h1 ref={heading} tabIndex={-1}>{lab.title}</h1>
        <p>{query.data?.session.title} · {lab.difficulty}</p></div>
    </header>
    <section className="as-panel lab-starter">
      <h2>Starter project</h2>
      <p>Download the standalone Maven exercise, extract it, and open the project in IntelliJ IDEA.</p>
      <ul className="lab-starter-details" aria-label="Project requirements">
        <li>Java {lab.starter.java}</li><li>Spring Boot {lab.starter.springBoot}</li>
        <li>Maven project</li><li>No database required</li>
      </ul>
      <a className="primary-button lab-download" download={lab.starter.filename}
        href={`${import.meta.env.BASE_URL}labs/${lab.lessonKey}/${lab.release}/${lab.starter.filename}`}>
        <Download size={17} aria-hidden="true"/>Download starter project
      </a>
    </section>
    <div className="lab-intro">
      <section className="as-panel"><h2>Scenario</h2><code>{lab.endpoint}</code><p>{lab.scenario}</p>
        <h3>Learning objectives</h3><ul>{lab.objectives.map(goal=><li key={goal}>{goal}</li>)}</ul>
      </section>
      <section className="as-panel"><h2>Before you start</h2>
        <ul>{lab.prerequisites.map(item=><li key={item}>{item}</li>)}</ul>
        <dl className="lab-files">{lab.files.map(file=><div key={file.name}>
          <dt><code>{file.name}</code></dt><dd>{file.purpose}</dd>
        </div>)}</dl>
      </section>
    </div>
    <section className="as-panel"><h2>Work through the lab</h2>
      <ol className="lab-steps">{lab.tasks.map(task=><li key={task.title}><h3>{task.title}</h3><p>{task.body}</p></li>)}</ol>
      <h3>Maven commands</h3>
      <p>Run these commands in your extracted starter folder.</p>
      <MavenCommands commands={lab.commands}/>
    </section>
    <section className="as-panel"><h2>HTTP verification matrix</h2>
      <dl className="lab-cases">{lab.cases.map(item=><div key={item.caller}>
        <dt>{item.caller}</dt><dd><strong>{item.status}</strong> <span>{item.challenge}</span></dd>
      </div>)}</dl>
      <p>JUnit in IntelliJ or Maven is the local check. DevQuest displays the instructions. Your results stay in your working copy.</p>
    </section>
    <section className="as-panel"><h2>Progressive hints</h2><p>Open one hint at a time when you get stuck.</p>
      {lab.hints.map((hint,index)=><details key={hint.title}><summary>Hint {index+1} · {hint.title}</summary><p>{hint.body}</p></details>)}
      <h3>Common mistakes</h3><ul>{lab.mistakes.map(item=><li key={item}>{item}</li>)}</ul>
    </section>
    <section className="as-panel"><h2>Reflect on the repair</h2>
      <ul>{lab.reflection.map(item=><li key={item}>{item}</li>)}</ul>
      <h3>Related Reading</h3>
      <nav className="lab-links" aria-label="Related Reading">{lab.reading.map(item=><Link className="secondary-button"
        key={item.anchor} to={workspace+'/read#'+item.anchor}><BookOpen size={16} aria-hidden="true"/>{item.label}</Link>)}</nav>
      <h3>Official references</h3><ul>{lab.sources.map(source=><li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul>
    </section>
  </div>
}

function MavenCommands({commands}: {commands: {label:string; text:string}[]}) {
  const [message, setMessage] = useState('')
  async function copy(label: string, command: string) {
    try {
      await navigator.clipboard.writeText(command)
      setMessage('Copied command. '+label+'.')
    } catch {
      setMessage('Clipboard unavailable. Select and copy the command text.')
    }
  }
  return <div className="lab-commands">
    {commands.map(command=><figure key={command.text}>
      <figcaption>{command.label}</figcaption>
      <pre tabIndex={0} aria-label={command.label}><code>{command.text}</code></pre>
      <button type="button" className="secondary-button" aria-label={'Copy command: '+command.label}
        onClick={()=>void copy(command.label,command.text)}><Copy size={16} aria-hidden="true"/>Copy</button>
    </figure>)}
    <p role="status">{message}</p>
  </div>
}
