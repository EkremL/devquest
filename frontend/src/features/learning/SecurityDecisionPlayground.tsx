import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Circle, Fingerprint, FlaskConical, LockKeyhole, Play, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react'
import { baseline, evaluateSecurityDecision, responseNames, type ResponseStatus, type SecurityScenario } from './securityDecision'
import './security-decision.css'

const presets = [
  { label: 'A name is not proof', changes: { evidence: 'claim' } },
  { label: 'Signed in, still denied', changes: { authority: 'task:create' } },
  { label: 'Permission is not scope', changes: { workspace: 'South' } },
  { label: 'A successful request', changes: {} },
] as const

const stages = [
  { label: 'Caller', icon: UserRound },
  { label: 'Authentication', icon: Fingerprint },
  { label: 'Action check', icon: ShieldCheck },
  { label: 'Scope check', icon: ShieldCheck },
  { label: 'Protected task', icon: LockKeyhole },
]

function Choices<T extends string | number>({ name, legend, value, options, onChange }: {
  name: string
  legend: string
  value: T | null
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return <fieldset className="sd-choices">
    <legend>{legend}</legend>
    <div>{options.map(option => <label key={option.value}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)}/>
      <span>{option.label}</span>
    </label>)}</div>
  </fieldset>
}

type Decision = ReturnType<typeof evaluateSecurityDecision>

function DecisionPath({ decision }: { decision: Decision | null }) {
  return <ol className="sd-path" aria-label="Decision path">
    {stages.map(({ label, icon: StageIcon }, index) => {
      const state = !decision ? 'Waiting' : decision.stop === index ? 'Stopped' :
        decision.stop !== null && index > decision.stop ? 'Not reached' : 'Passed'
      const Icon = state === 'Passed' ? Check : state === 'Stopped' ? X : Circle
      return <li key={label} data-state={state} style={{ animationDelay: `${index * 65}ms` }}>
        <span className="sd-stage-icon"><StageIcon size={19} aria-hidden="true"/></span>
        <strong>{label}</strong>
        <span className="sd-stage-status"><Icon size={13} aria-hidden="true"/>{state}</span>
      </li>
    })}
  </ol>
}

const predictions = ([200, 401, 403] as const).map(status => ({ value: status, label: `${status} ${responseNames[status]}` }))

export function SecurityDecisionPlayground() {
  const id = useId()
  const [scenario, setScenario] = useState<SecurityScenario>(baseline)
  const [prediction, setPrediction] = useState<ResponseStatus | null>(null)
  const [run, setRun] = useState<{ decision: Decision; prediction: ResponseStatus; sequence: number } | null>(null)
  const [notice, setNotice] = useState('')

  function configure<Variable extends keyof SecurityScenario>(variable: Variable, value: SecurityScenario[Variable]) {
    setScenario({ ...scenario, [variable]: value })
    setNotice(run ? 'Request changed. Predict and run the new request.' : '')
    setRun(null)
    setPrediction(null)
  }

  function loadPreset(changes: Partial<SecurityScenario>, message: string) {
    setScenario({ ...baseline, ...changes })
    setPrediction(null)
    setRun(null)
    setNotice(message)
  }

  function runRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (prediction === null) return
    setRun({ decision: evaluateSecurityDecision(scenario), prediction, sequence: (run?.sequence ?? 0) + 1 })
    setNotice('')
  }

  return <section className="sd-playground" aria-labelledby={id + '-title'}>
    <header className="sd-header">
      <p className="sd-kicker"><FlaskConical size={17} aria-hidden="true"/>Educational simulation · no live API calls</p>
      <h4 id={id + '-title'}>You Are the Backend <span>Security Decision Playground</span></h4>
      <p>Investigate a request to read Task 17. Maya’s account belongs to North, and the request authenticates her only with valid evidence. The API then requires <code>task:read</code> and checks whether Task 17’s stored workspace matches Maya’s North scope. The authority and workspace selectors simulate trusted server records.</p>
    </header>
    <div className="sd-presets" role="group" aria-label="Challenge presets">
      {presets.map(preset => <button type="button" key={preset.label} onClick={() => loadPreset(preset.changes, `${preset.label} loaded. Predict and run the request.`)}>{preset.label}</button>)}
    </div>
    <form className="sd-form" onSubmit={runRequest}>
      <div className="sd-config">
        <Choices name={id + '-evidence'} legend="Authentication evidence" value={scenario.evidence} onChange={value => configure('evidence', value)}
          options={[{ value: 'verified', label: 'Verified session for Maya' }, { value: 'claim', label: 'Claim without verified evidence' }]}/>
        <Choices name={id + '-authority'} legend="Trusted authority" value={scenario.authority} onChange={value => configure('authority', value)}
          options={[{ value: 'task:read', label: 'task:read' }, { value: 'task:create', label: 'task:create' }]}/>
        <Choices name={id + '-workspace'} legend="Task 17’s stored workspace" value={scenario.workspace} onChange={value => configure('workspace', value)}
          options={[{ value: 'North', label: 'North' }, { value: 'South', label: 'South' }]}/>
      </div>
      <div className="sd-run">
        <Choices name={id + '-prediction'} legend="Predict the response" value={prediction} options={predictions} onChange={value => {
          setPrediction(value)
          setRun(null)
          setNotice('')
        }}/>
        <div className="sd-actions">
          <button className="primary-button" type="submit" disabled={prediction === null}><Play size={16} aria-hidden="true"/>Run request</button>
          <button className="secondary-button" type="button" onClick={() => loadPreset({}, 'Baseline restored. Predict and run the request.')}><RotateCcw size={16} aria-hidden="true"/>Reset to baseline</button>
        </div>
      </div>
    </form>
    <div className="sd-output">
      <DecisionPath key={run?.sequence ?? 0} decision={run?.decision ?? null}/>
      <div className="sd-announcement" role="status" aria-atomic="true">
        {run ? <div className="sd-result" data-allowed={run.decision.status === 200}>
          <div className="sd-result-heading"><strong>{run.decision.status} {responseNames[run.decision.status]}</strong><span>{run.decision.title}</span></div>
          <p>{run.prediction === run.decision.status ? `Your ${run.prediction} prediction matches this run.` :
            `You predicted ${run.prediction}. The model returned ${run.decision.status}.`} {run.decision.reason}</p>
          <p className="sd-next"><ArrowRight size={16} aria-hidden="true"/><span>{run.decision.next}</span></p>
        </div> : <p className="sd-waiting">{notice || 'Choose a prediction, then run the request to trace its path.'}</p>}
      </div>
      <p className="sd-contract">These responses are this fictional API’s contract. The playground does not run Spring Security.</p>
    </div>
  </section>
}
