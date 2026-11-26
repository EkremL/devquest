import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Database, Fingerprint, Globe, Network, Server, Timer, UserRound } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { absoluteMinutes, idleMinutes, incidentDecisions, inspectCookie, inspectLogout, inspectRotation, lookupNode,
  requestWindow, signInSteps, sustainWindow, windowStart, windowStatus, type CookieProbe, type LogoutMode,
  type NodeName, type StoreMode, type StoreState } from './sessionLabModel'
import type { ReportActivity } from './missionIds'
import './session-control.css'

type Props = { report: ReportActivity }

function useObservations(required: readonly string[], report: ReportActivity) {
  const [seen, setSeen] = useState<string[]>([])
  return { count: required.filter(key => seen.includes(key)).length, observe(key: string) {
    const next = seen.includes(key) ? seen : [...seen, key]
    setSeen(next)
    report(required.every(item => next.includes(item)))
  } }
}

function RecordFields({ values }: { values: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="sc-fields">{values.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

const signInStations = [
  { id:'Browser', label:'Browser', icon:Globe }, { id:'Application', label:'Application', icon:Server },
  { id:'Authentication mechanism', label:'Evidence verifier', icon:Fingerprint }, { id:'Session repository', label:'Session repository', icon:Database },
] as const
export function SignInSequence({ report }: Props) {
  const [position, setPosition] = useState(0)
  const step = signInSteps[position]
  const station = step.source === 'Security context' ? 'Application' : step.source
  return <div className="mx-canvas sc-console" data-surface="signin">
    <LabHeading label="Session establishment · Servlet model" title="Follow a protected request from the browser">
      Step through an anonymous form session, verified sign-in and a second request that restores the saved security context.
    </LabHeading>
    <div className="sc-controls">
      <button type="button" className="secondary-button" disabled={position === 0} onClick={() => setPosition(position - 1)}>Previous stage</button>
      <strong aria-live="polite">{position + 1} / {signInSteps.length} · {step.label}</strong>
      <button type="button" className="primary-button" disabled={position === signInSteps.length - 1} onClick={() => {
        setPosition(position + 1); report(position + 1 === signInSteps.length - 1)
      }}>Next stage <ArrowRight size={16} aria-hidden="true"/></button>
    </div>
    <TechnicalPath label="Active session-establishment component" nodes={signInStations.map(item => ({
      ...item, value:item.id === station ? 'Active in this stage' : 'Waiting', tone:item.id === station ? 'trusted' : 'quiet',
      boundary:item.id === 'Application',
    }))}/>
    <RecordFields values={ [['Browser handle',step.browser],['Server record',step.record],['Security context',step.context]] }/>
    <CodeSample language={position === 3 || position === 4 ? 'text' : 'http'} text={step.message} wrap/>
    <Feedback title={step.label} tone={position >= 3 ? 'trusted' : 'identity'}>{step.explanation}</Feedback>
  </div>
}

const startingProbe: CookieProbe = {
  secure:true, httpOnly:true, sameSite:'Lax', secureTransport:true,
  host:'roster.example.test', path:'/roster/today', context:'same-site',
}
export function CookieWorkbench({ report }: Props) {
  const [probe, setProbe] = useState(startingProbe)
  const [result, setResult] = useState<ReturnType<typeof inspectCookie> | null>(null)
  const tracks = useObservations(['scope','site','secure','script'], report)
  function set<K extends keyof CookieProbe>(key: K, value: CookieProbe[K]) {
    setProbe({ ...probe, [key]: value }); setResult(null); report()
  }
  function evaluate() {
    const output = inspectCookie(probe)
    setResult(output); report()
    if (output.reason.includes('scope does not match')) tracks.observe('scope')
    else if (output.reason.startsWith('SameSite excludes')) tracks.observe('site')
    else if (output.reason.startsWith('Secure requires')) tracks.observe('secure')
    else if (output.sent && !output.scriptReadable) tracks.observe('script')
  }
  return <div className="mx-canvas sc-console" data-surface="cookie">
    <LabHeading label="Cookie workbench · fictional storage" title="Decide whether the browser sends the cookie">
      Run four probes: a wrong host or path, a blocked cross-site request, HTTP with Secure, and successful delivery with HttpOnly.
    </LabHeading>
    <div className="sc-pair">
      <div className="sc-instrument">
        <RecordFields values={ [['Name','ROSTER_SESSION'],['Value','demo-opaque'],['Host-only','roster.example.test'],
          ['Cookie Path','/roster'],['Browser retention','No Max-Age or Expires']] }/>
        <fieldset className="sc-checks"><legend>Storage attributes</legend>
          <label><input type="checkbox" checked={probe.secure} onChange={event => set('secure',event.currentTarget.checked)}/> Secure</label>
          <label><input type="checkbox" checked={probe.httpOnly} onChange={event => set('httpOnly',event.currentTarget.checked)}/> HttpOnly</label>
          <label>SameSite<select aria-label="SameSite policy" value={probe.sameSite} onChange={event => set('sameSite',event.currentTarget.value as CookieProbe['sameSite'])}>
            {['Lax','Strict','None'].map(value => <option key={value}>{value}</option>)}</select></label>
        </fieldset>
      </div>
      <div className="sc-selects">
        <label>Connection<select aria-label="Cookie connection" value={probe.secureTransport ? 'https' : 'http'} onChange={event => set('secureTransport',event.currentTarget.value === 'https')}><option value="https">HTTPS</option><option value="http">HTTP</option></select></label>
        <label>Target host<select aria-label="Target host" value={probe.host} onChange={event => set('host',event.currentTarget.value)}><option>roster.example.test</option><option>ops.example.test</option></select></label>
        <label>Target path<select aria-label="Target path" value={probe.path} onChange={event => set('path',event.currentTarget.value)}><option>/roster/today</option><option>/roster-old</option></select></label>
        <label>Request context<select aria-label="Request context" value={probe.context} onChange={event => set('context',event.currentTarget.value as CookieProbe['context'])}>
          <option value="same-site">Same-site request</option><option value="top-level-get">Cross-site top-level GET</option><option value="cross-site-post">Cross-site POST</option></select></label>
        <button type="button" className="primary-button" onClick={evaluate}>Evaluate delivery</button>
        <span className="sc-count">{tracks.count} / 4 comparisons observed</span>
      </div>
    </div>
    <div className="sc-pair sc-messages">
      <CodeSample language="http" text={'HTTP/1.1 200 OK\n' + inspectCookie(probe).header} wrap activeLine={1}/>
      <CodeSample language="http" text={result ? (probe.context === 'cross-site-post' ? 'POST ' : 'GET ') + probe.path +
        ' HTTP/1.1\nHost: ' + probe.host + (result.sent ? '\n' + result.request : '') : 'Waiting for the next request'} wrap
        activeLine={result?.sent ? 2 : undefined}/>
    </div>
    <Feedback title={result ? result.sent ? 'Cookie delivered' : 'Cookie omitted' : 'Awaiting delivery probe'}
      tone={result ? result.sent ? 'trusted' : 'rejected' : 'pending'}>
      {result ? result.reason + '. Script visibility at the cookie’s HTTPS origin: ' +
        (!result.stored ? 'cookie rejected at storage.' : result.scriptReadable ? 'readable.' : 'hidden by HttpOnly.') :
        'The model assumes an HTTPS issuer, explicit SameSite and ordinary cookie delivery without additional privacy restrictions.'}
    </Feedback>
  </div>
}

function formatMinute(value: number) {
  return Math.floor(value / 60) + 'h ' + String(value % 60).padStart(2, '0') + 'm'
}

export function SessionTimeMachine({ report }: Props) {
  const [state, setState] = useState(windowStart)
  const [decision, setDecision] = useState('')
  const tracks = useObservations(['renewed','idle','absolute','invalidated'], report)
  const current = windowStatus(state)
  const idleLeft = Math.max(0,state.last + idleMinutes - state.now)
  const absoluteLeft = Math.max(0,absoluteMinutes - state.now)
  const idleDeadline = state.last + idleMinutes
  const onRail = (minute: number) => Math.round(8 + 584 * Math.min(1,minute / absoluteMinutes))
  function submit() {
    if (current === 'Active') {
      setState(requestWindow(state))
      setDecision(state.now > state.last ? 'Accepted · idle expiry moved from the last accepted activity' :
        'Accepted · last activity is already at this instant')
      if (state.now > state.last) tracks.observe('renewed')
    } else {
      setDecision('Rejected · ' + current)
      if (current === 'Invalidated') tracks.observe('invalidated')
      if (current === 'Idle timeout expired' && idleLeft === 0 && state.now === state.last + idleMinutes) tracks.observe('idle')
      if (current === 'Absolute lifetime expired' && state.now === absoluteMinutes) tracks.observe('absolute')
    }
    report()
  }
  function advance(minutes: number) {
    setState({ ...state, now:state.now + minutes }); setDecision(''); report()
  }
  return <div className="mx-canvas sc-console" data-surface="clock">
    <LabHeading label="Session time machine · illustrative policy" title="Race the idle and absolute deadlines">
      Renew activity before 15 minutes. Probe rejection exactly at the idle and 8-hour boundaries. Finally invalidate a fresh session and try again.
    </LabHeading>
    <RecordFields values={ [['Clock',formatMinute(state.now)],['Authentication established','0h 00m'],['Last accepted activity',formatMinute(state.last)],
      ['Browser cookie','Retained in this model'],['Server session',current]] }/>
    <figure className="sc-time-rail">
      <figcaption><span>Sign-in · 0h</span><span>Absolute deadline · 8h</span></figcaption>
      <svg viewBox="0 0 600 30" preserveAspectRatio="none" aria-hidden="true">
        <path d="M8 16H592" className="sc-time-track"/>
        <path d={`M8 16H${onRail(state.now)}`} className="sc-time-elapsed"/>
        <path d={`M${onRail(state.last)} 24V16`} className="sc-time-last"/>
        {idleDeadline <= absoluteMinutes && <path d={`M${onRail(idleDeadline)} 28V15`} className="sc-time-idle"/>}
        <path d={`M${onRail(state.now)} 4V17`} className="sc-time-now"/>
      </svg>
      <div aria-hidden="true"><span className="sc-time-now">{state.now > absoluteMinutes ? 'Clock past 8h' : 'Current time'}</span>
        <span className="sc-time-last">Last activity</span><span className="sc-time-idle">{idleDeadline > absoluteMinutes ? 'Idle deadline beyond 8h' : 'Idle deadline'}</span></div>
      <span className="sr-only">Idle deadline is {formatMinute(idleDeadline)}.</span>
    </figure>
    <div className="sc-clock-tracks">
      <label>Idle window <meter min={0} max={idleMinutes} value={idleLeft}/><span>{idleLeft} min left</span></label>
      <label>Absolute lifetime <meter min={0} max={absoluteMinutes} value={absoluteLeft}/><span>{formatMinute(absoluteLeft)} left</span></label>
    </div>
    <div className="sc-controls">
      <button type="button" className="secondary-button" onClick={() => advance(14)}><Timer size={16} aria-hidden="true"/>Advance 14 min</button>
      <button type="button" className="secondary-button" onClick={() => advance(1)}>Advance 1 min</button>
      <button type="button" className="secondary-button" disabled={current !== 'Active' || state.now >= absoluteMinutes - 1} onClick={() => {
        setState(sustainWindow(state)); setDecision('Accepted every 10 minutes or sooner through 7h 59m'); report()
      }}>Run periodic requests to 7h 59m</button>
      <button type="button" className="primary-button" onClick={submit}>Request roster</button>
      <button type="button" className="secondary-button" disabled={current !== 'Active'} onClick={() => {
        setState({ ...state, invalidated:true }); setDecision(''); report()
      }}>Invalidate session</button>
      <button type="button" className="secondary-button" onClick={() => {
        setState(windowStart); setDecision(''); report()
      }}>Reset clock</button>
    </div>
    <Feedback title={decision || current} tone={current === 'Active' ? 'trusted' : 'rejected'}>
      {tracks.count} / 4 observations. An accepted request renews idle time. The absolute deadline stays fixed and a retained cookie cannot restore a retired session.
    </Feedback>
  </div>
}

const storeModes = [{id:'local',label:'Node-local stores'},{id:'shared',label:'Shared store'}] as const
export function DistributedSessionLab({ report }: Props) {
  const [store, setStore] = useState<StoreState>({ mode:'local', available:true, signedIn:false })
  const [target, setTarget] = useState<NodeName | null>(null)
  const tracks = useObservations(['local/A','local/B','shared/B','outage'],report)
  const result = target ? lookupNode(store,target) : null
  function configure(mode: StoreMode) { setStore({ mode,available:true,signedIn:false }); setTarget(null); report() }
  function route(node: NodeName) {
    setTarget(node);report()
    if (store.signedIn) tracks.observe(store.available ? store.mode + '/' + node : 'outage')
  }
  return <div className="mx-canvas sc-console" data-surface="distributed">
    <LabHeading label="Cluster routing" title="Follow the same cookie to two nodes">
      Sign in on A, then route to A and B. Switch to shared storage and sign in again. Test B while the shared repository is up and down.
    </LabHeading>
    <div className="sc-controls">
      <Switcher options={storeModes} label="Session storage topology" value={store.mode} onChange={configure}/>
      <button type="button" className="primary-button" disabled={!store.available} onClick={() => {setStore({ ...store,signedIn:true });setTarget(null);report()}}>Sign in on A</button>
      {store.mode === 'shared' && <button type="button" className="secondary-button" onClick={() => {
        setStore({ ...store,available:!store.available });setTarget(null);report()
      }}>{store.available ? 'Simulate store outage' : 'Restore repository'}</button>}
    </div>
    <div className="sc-topology" aria-label="Browser, load balancer, serving nodes and session repositories">
      <div className="sc-entry"><Globe size={20} aria-hidden="true"/> Browser <small>{store.signedIn ? 'Fictional session cookie' : 'No cookie'}</small></div>
      <ArrowDown aria-hidden="true" size={18}/>
      <div className="sc-entry"><Network size={20} aria-hidden="true"/> Load balancer</div>
      <div className="sc-branches">
        {(['A','B'] as const).map(node => <div key={node} className="sc-branch">
          <ArrowDown aria-hidden="true" size={18}/>
          <button className="secondary-button" type="button" aria-pressed={target === node} onClick={() => route(node)}><Server size={18} aria-hidden="true"/>Route to node {node}</button>
          <ArrowDown aria-hidden="true" size={18}/>
          {store.mode === 'local' && <span>{store.signedIn && node === 'A' ? 'Local store · context saved' : 'Local store · no record'}</span>}
        </div>)}
      </div>
      {store.mode === 'shared' && <div className="sc-entry"><Database size={20} aria-hidden="true"/>Shared repository
        <small>{!store.available ? 'Unavailable' : store.signedIn ? 'Context saved' : 'No record'}</small></div>}
    </div>
    <Feedback title={result?.result ?? 'Awaiting route'} tone={result ? result.readable ? 'trusted' : 'rejected' : 'pending'}>
      {result ? result.location + '. ' + (result.readable ? 'This node can evaluate roster access.' : 'The roster stays protected until authentication can be restored.') :
        'Changing the topology starts a fresh configuration. It does not migrate a local record.'}
      {' '}{tracks.count} / 4 routing comparisons.
    </Feedback>
  </div>
}

export function RotationExplorer({ report }: Props) {
  const [rotate, setRotate] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof inspectRotation> | null>(null)
  const tracks = useObservations(['reused','rotated'],report)
  return <div className="mx-canvas sc-console" data-surface="rotate">
    <LabHeading label="Identifier rotation · defensive regression" title="Compare identifiers across successful sign-in">
      Verify what the configured repository would resolve for a known pre-login ID in each case. All handles are fictional.
    </LabHeading>
    <div className="sc-controls">
      <Switcher label="Identifier strategy" options={[{id:'reuse',label:'Keep original ID'},{id:'rotate',label:'Rotate session ID'}]}
        value={rotate ? 'rotate' : 'reuse'} onChange={mode => {setRotate(mode === 'rotate');setResult(null);report()}}/>
      <button type="button" className="primary-button" onClick={() => {setResult(inspectRotation(rotate));tracks.observe(rotate ? 'rotated' : 'reused')}}>Apply successful sign-in</button>
    </div>
    <TechnicalPath label="Before-and-after session identifier" nodes={[
      {id:'pre',label:'Anonymous session',value:'demo-pre',icon:UserRound,tone:'identity'},
      {id:'auth',label:'Successful verification',value:'Fictional operator',icon:Fingerprint,tone:'trusted'},
      {id:'post',label:'Authenticated session',value:result?.current ?? 'Awaiting sign-in',icon:Database,tone:result ? 'trusted' : 'quiet'},
    ]}/>
    <Feedback title={result ? result.originalResolves ? 'Pre-login ID still resolves' : 'Pre-login ID retired' : 'Awaiting rotation comparison'}
      tone={result ? result.originalResolves ? 'rejected' : 'trusted' : 'pending'}>
      {result ? result.state + '. Changing the identifier can keep the current session attributes. Invalidation ends the session itself.' :
        'The safe setting models the modern Servlet changeSessionId strategy.'}
    </Feedback>
  </div>
}

const logoutModes = [{id:'cookie',label:'Remove cookie only'},{id:'invalidate',label:'Invalidate server session'},{id:'complete',label:'Complete logout'}] as const
export function LogoutLab({ report }: Props) {
  const [mode, setMode] = useState<LogoutMode>('cookie')
  const [result, setResult] = useState<ReturnType<typeof inspectLogout> | null>(null)
  const tracks = useObservations(logoutModes.map(item => item.id),report)
  return <div className="mx-canvas sc-console" data-surface="logout">
    <LabHeading label="Logout verification" title="Check the browser and server separately">
      This configured application uses a CSRF-protected POST for complete logout. Compare what remains usable after each operation.
    </LabHeading>
    <div className="sc-controls">
      <Switcher label="Logout experiment" options={logoutModes} value={mode} onChange={value => {setMode(value);setResult(null);report()}}/>
      <button type="button" className="primary-button" onClick={() => {setResult(inspectLogout(mode));tracks.observe(mode)}}>Probe original ID</button>
    </div>
    <RecordFields values={[['Browser cookie',result ? result.cookie ? 'Retained' : 'Removed' : 'Stored'],
      ['Server session',result ? result.session ? 'Still active' : 'Invalidated' : 'Active'],
      ['Repository and next context',result?.repository ?? 'Stored authentication'],
      ['Current-request context',result && mode === 'complete' ? 'Cleared by logout handler' : 'No explicit context clear in this probe']]}/>
    <Feedback title={result?.request ?? 'Awaiting logout probe'} tone={result ? result.nextContext ? 'rejected' : 'trusted' : 'pending'}>
      {result && mode === 'complete' ? 'The configured flow invalidates the session, clears the current context and repository, and cleans up the cookie.' :
        'The browser’s cookie jar and the repository can change independently. Earlier in-flight requests and external sessions are outside this probe.'}
    </Feedback>
  </div>
}

const incidentRecords = [
  {id:'wire',label:'Browser trace',text:'A and B both receive the same redacted session cookie. Cookie scope is valid.'},
  {id:'state',label:'Repository record',text:'Node A restores authentication. Node B queries a different local store and records a miss.'},
  {id:'time',label:'Lifetime',text:'The authenticated session is 3 minutes old. Last accepted activity was 1 minute ago.'},
] as const

export function SessionIncident({ report }: Props) {
  const [record, setRecord] = useState<typeof incidentRecords[number]['id']>('wire')
  const [read, setRead] = useState<string[]>(['wire'])
  const [result, setResult] = useState<number | null>(null)
  return <div className="mx-canvas sc-console" data-surface="distributed">
    <LabHeading label="Deployment incident" title="Explain the intermittent sign-in prompt">
      Inspect three records from a two-node rollout. Submit the cause, a repair and the safe behavior when the repaired store fails.
    </LabHeading>
    <Switcher label="Session incident evidence" options={incidentRecords} value={record} onChange={id => {
      setRecord(id);setRead([...read,id]);setResult(null);report()
    }}/>
    <p className="sc-evidence" role="status">{incidentRecords.find(item => item.id === record)!.text}</p>
    <form onChange={() => {setResult(null);report()}} onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const error = incidentRecords.every(item => read.includes(item.id))
        ? incidentDecisions.findIndex(item => data.get(item.id) !== item.options[item.answer]) : -2
      setResult(error);report(error === -1)
    }}>
      <div className="sc-selects sc-final">{incidentDecisions.map(item => <label key={item.id}>{item.label}
        <select aria-label={item.label} name={item.id} required defaultValue=""><option value="" disabled>Choose…</option>
          {item.options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div>
      <button type="submit" className="primary-button">Submit session diagnosis</button>
    </form>
    {result !== null && <Feedback title={result === -1 ? 'Session incident resolved' : 'Recheck the diagnosis'}
      tone={result === -1 ? 'trusted' : 'rejected'}>{result === -1 ? 'The cookie arrives. The lookup fails on B. Use a compatible shared repository and keep protected data closed if it becomes unavailable.' :
        result === -2 ? 'Inspect the browser, repository and lifetime records.' : 'Review: ' + incidentDecisions[result].label}</Feedback>}
  </div>
}
