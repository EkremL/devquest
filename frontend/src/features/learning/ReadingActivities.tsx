import { useId, useState } from 'react'
import { ArrowDown, Check, CheckCheck, ChevronDown, CircleHelp, Fingerprint, GitBranch, KeyRound, LockKeyhole, Network, Route, Send, ShieldCheck, Terminal } from 'lucide-react'
import type { FlowCase, Outcome, Practice } from './api'
const outcomeIcons = { '401': KeyRound, '403': LockKeyhole, '200': ShieldCheck }

export function OutcomeCards({ outcomes }: { outcomes: Outcome[] }) {
  return <figure className="rd-outcomes">
    <figcaption><GitBranch size={17} /> Possible responses for this endpoint</figcaption>
    <div className="rd-cards">{outcomes.map(({ status, title, detail, action }) => {
      const Icon = outcomeIcons[status]
      return <div key={status} className={'rd-outcome status-' + status}>
        <div className="rd-code-status"><strong>{status}</strong><Icon size={23} /></div>
        <h3>{title}</h3><p>{detail}</p><small>{action}</small>
      </div>})}</div>
  </figure>
}

export function ReadingPractice({ practice }: { practice: Practice }) {
  const group = useId()
  const [choice, setChoice] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  return <div className="rd-practice">
    <div className="rd-kicker"><CircleHelp size={16} /> Think it through</div>
    <fieldset><legend>{practice.prompt}</legend>
      <div className="rd-choices">{practice.choices.map((item, index) => <label key={item.label}>
        <input type="radio" name={group} checked={choice === index} onChange={() => { setChoice(index); setRevealed(false) }} />
        <span>{item.label}</span>
      </label>)}</div>
    </fieldset>
    <button type="button" className="rd-reveal" disabled={choice === null} aria-expanded={revealed}
      aria-controls={group + '-reason'} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide reasoning' : 'Reveal reasoning'}</button>
    <div id={group + '-reason'} aria-live="polite">{revealed && choice !== null && <p className="rd-answer">{practice.choices[choice].reason}</p>}</div>
  </div>
}

// Shared stations let learners see where two requests diverge and where they converge.
const stations = {
  request: [160, 17, 108, 'HTTP request'],
  chain: [160, 55, 130, 'Security filter chain'],
  basic: [160, 94, 132, 'Basic authentication'],
  policy: [223, 143, 112, 'Authorization'],
  translate: [129, 191, 136, 'Exception translation'],
  entry: [51, 246, 88, 'Entry point'],
  denied: [162, 246, 98, 'Denial handler'],
  controller: [270, 246, 86, 'Controller'],
  '401': [51, 292, 58, '401'],
  '403': [162, 292, 58, '403'],
  '200': [270, 292, 58, '200'],
} as const
type Station = keyof typeof stations
const trails: [Station, Station][] = [
  ['request', 'chain'], ['chain', 'basic'], ['basic', 'entry'], ['basic', 'policy'],
  ['policy', 'translate'], ['policy', 'controller'], ['translate', 'entry'], ['translate', 'denied'],
  ['entry', '401'], ['denied', '403'], ['controller', '200'],
]

function RouteDiagram({ path }: { path: FlowCase }) {
  const active: Station[] = ['request', 'chain', 'basic']
  if (path.authorization) active.push('policy')
  if (path.translation) active.push('translate')
  if (path.status === '401') active.push('entry', '401')
  else if (path.status === '403') active.push('denied', '403')
  else active.push('controller', '200')
  const marker = useId().replace(/:/g, '')
  return <svg className="rd-schematic" viewBox="0 0 320 313" aria-hidden="true" focusable="false">
    <defs><marker id={marker} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
      <path d="M0 0 L6 3 L0 6 Z" fill="var(--color-aqua-teal)" />
    </marker></defs>
    {trails.map(([from, to]) => {
      const [x, y] = stations[from]
      const [endX, endY] = stations[to]
      const on = active.includes(from) && active[active.indexOf(from) + 1] === to
      const middle = (y + endY) / 2
      // Route the early authentication failure down the outside of downstream checks.
      const d = from === 'basic' && to === 'entry'
        ? 'M94 94 H65 Q51 94 51 108 V230'
        : `M${x} ${y + 13} C${x} ${middle},${endX} ${middle},${endX} ${endY - 16}`
      return <path key={from + to} d={d} className={on ? 'trail selected' : 'trail'} markerEnd={on ? 'url(#' + marker + ')' : undefined}/>
    })}
    {(Object.keys(stations) as Station[]).map(key => {
      const [x, y, width, title] = stations[key]
      return <g key={key} transform={`translate(${x} ${y})`} className={active.includes(key) ? 'station selected' : 'station'}>
        <rect x={-width / 2} y="-13" width={width} height="26" rx="5"/>
        <text textAnchor="middle" dominantBaseline="central">{title}</text>
      </g>
    })}
  </svg>
}

export function RequestFlow({ cases, request }: { cases: FlowCase[]; request: string }) {
  const group = useId()
  const [index, setIndex] = useState(0)
  const path = cases[index]
  const stages = [
    { label: 'HTTP request', value: request, icon: Send },
    { label: 'Security filter chain', value: 'BasicAuthenticationFilter', icon: Network },
    { label: 'Authentication', value: path.authentication, icon: Fingerprint },
    ...(path.authorization ? [{ label: 'Authorization', value: path.authorization, icon: ShieldCheck }] : []),
    ...(path.translation ? [{ label: 'Translate denial', value: path.translation, icon: GitBranch }] : []),
    { label: path.status === '200' ? 'Controller' : 'Handler', value: path.destination, icon: Route },
    { label: 'HTTP response', value: path.status + ({ '401': ' · Basic challenge', '403': ' · Refusal', '200': ' · Task summary' }[path.status] ?? ''), icon: Terminal },
  ]
  return <figure className="rd-flow">
    <figcaption><GitBranch size={18} /> Trace a request</figcaption>
    <p className="rd-flow-intro">Select a case to follow its path through this Basic configuration.</p>
    <fieldset className="rd-cases"><legend className="sr-only">Request case</legend>
      {cases.map((item, i) => <label key={item.label}>
        <input type="radio" name={group} checked={i === index} onChange={() => setIndex(i)} />
        <span>{i === index ? <Check size={14} /> : <span className="rd-empty-dot" />}{item.label}</span>
      </label>)}
    </fieldset>
    <RouteDiagram path={path}/>
    <p aria-live="polite" className="rd-flow-alt"><CheckCheck size={17} /><span>{path.explanation}</span></p>
    <details className="rd-disclosure"><summary><Route size={17}/>Text walkthrough<ChevronDown size={16}/></summary>
    <ol className="rd-route" aria-label={'Request path: ' + path.label}>
      {stages.map(({ label, value, icon: Icon }, i) => <li key={label} className={i === stages.length - 1 ? 'rd-terminal status-' + path.status : ''}>
        <span className="rd-station"><Icon size={16}/></span>
        <span className="rd-step-label">{label}</span><strong>{value}</strong>
        {i < stages.length - 1 && <ArrowDown className="rd-wire" size={13} />}
      </li>)}
    </ol></details>
  </figure>
}
