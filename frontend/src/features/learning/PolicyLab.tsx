import { useState } from 'react'
import { Database, Fingerprint, Globe, Layers, LockKeyhole, Server, ShieldCheck } from 'lucide-react'
import { Feedback, LabHeading, Switcher, TechnicalPath, type Tone } from './MissionPrimitives'
import { dependencies, evaluateFailure, evaluateGrants, evaluatePolicy, grantRows, policyRequests, releaseChecks,
  reviewRelease, traceEnforcement, type Enforcement, type Grant } from './policyLabModel'
import type { ReportActivity } from './missionIds'
import './policy-lab.css'

type ActivityProps = { report: ReportActivity }

export function PermissionMatrix({ report }: ActivityProps) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [reviewed, setReviewed] = useState(false)
  const result = evaluateGrants(grants)
  return <div className="mx-canvas pl-workbench">
    <LabHeading label="Permission builder" title="How much access does the exporter need?">
      Give the scheduled North exporter access to status and downloads in North. Status metadata and file bytes are both private.
    </LabHeading>
    <table className="pl-matrix">
      <caption className="sr-only">Workspace export permission matrix</caption>
      <thead><tr><th scope="col">Operation and scope</th><th scope="col">Job needs</th><th scope="col">Grant</th><th scope="col">Effect</th></tr></thead>
      <tbody>{grantRows.map(row => {
        const on = grants.includes(row.id)
        const effect = on ? row.required ? 'Allowed' : 'Exposure' : row.required ? 'Missing' : 'Denied'
        return <tr key={row.id} data-effect={effect}>
          <th scope="row">{row.label}<small>{row.target}</small></th>
          <td>{row.required ? 'Required' : 'No'}</td>
          <td><label className="pl-toggle"><input type="checkbox" aria-label={row.label + ' · ' + row.target}
            checked={on} onChange={() => {
              setGrants(on ? grants.filter(grant => grant !== row.id) : [...grants, row.id])
              setReviewed(false); report()
            }}/></label></td>
          <td>{effect}</td>
        </tr>
      })}</tbody>
    </table>
    <button type="button" className="primary-button" onClick={() => { setReviewed(true); report(result.minimum) }}>Review grants</button>
    {reviewed && <Feedback title={result.minimum ? 'Minimum access confirmed' : 'Adjust the permission set'}
      tone={result.minimum ? 'trusted' : 'pending'}>
      {result.minimum ? 'Both required operations work in North. Publishing, creation and cross-workspace downloads remain closed.' :
        [result.missing.length ? 'Missing: ' + result.missing.map(row => row.label).join(', ') + '.' : '',
          result.exposure.length ? 'Unnecessary: ' + result.exposure.map(row => row.label + ' (' + row.target + ')').join(', ') + '.' : ''].join(' ').trim()}
    </Feedback>}
  </div>
}

const fallbackChoices = [{ id: 'open', label: 'Allow unmatched' }, { id: 'closed', label: 'Deny unmatched' }] as const
type PolicyRequest = typeof policyRequests[number]['id']

export function DefaultPolicyLab({ report }: ActivityProps) {
  const [request, setRequest] = useState<PolicyRequest>('unmatched')
  const [fallback, setFallback] = useState<'open' | 'closed'>('open')
  const [result, setResult] = useState<ReturnType<typeof evaluatePolicy> | null>(null)
  const [evidence, setEvidence] = useState<string[]>([])
  const selected = policyRequests.find(item => item.id === request)!
  const ordering = ['identity', 'scope', 'rule', 'fallback']
  const reached = result ? ordering.indexOf(result.stop) : -1
  const ruleSkipped = result?.stop === 'rule'
  const state = (index: number, label: string): [string, Tone] => {
    if (!result) return ['Waiting', 'pending']
    if (index > reached) return [ruleSkipped ? 'Not needed' : 'Not reached', 'quiet']
    if (index === reached) return [label, result.allowed ? 'trusted' : 'rejected']
    return [index === 2 ? 'No matching rule' : 'Passed', index === 2 ? 'pending' : 'trusted']
  }
  function evaluate() {
    const evaluated = evaluatePolicy(request, fallback === 'open')
    const next = [...evidence, fallback + '/' + request]
    setEvidence(next); setResult(evaluated)
    report(next.includes('open/unmatched') && ['same', 'cross', 'unmatched'].every(id => next.includes('closed/' + id)))
  }
  const stages = [
    { id: 'identity', label: 'Verified caller', icon: Fingerprint, result: 'No caller' },
    { id: 'scope', label: 'Stored resource', icon: Database, result: 'Outside scope' },
    { id: 'rule', label: 'Explicit rule', icon: ShieldCheck, result: 'Download rule matched' },
    { id: 'fallback', label: 'Fallback decision', icon: LockKeyhole, result: result?.allowed ? 'Allowed by fallback' : 'Denied by default' },
  ]
  return <div className="mx-canvas pl-workbench pl-policy">
    <LabHeading label="Rule evaluation" title="Close the unmatched route">
      Observe the unsafe publish result. Set the fallback to deny, then run the North download, South download and publish probes.
    </LabHeading>
    <Switcher label="Policy probe" options={policyRequests} value={request} onChange={id => { setRequest(id); setResult(null); report() }}/>
    <dl className="pl-facts"><div><dt>Caller</dt><dd>{selected.verified ? 'Verified member · North' : 'Unverified'}</dd></div>
      <div><dt>Action</dt><dd>{selected.action}</dd></div><div><dt>Stored export</dt><dd>{selected.target}</dd></div></dl>
    <div className="mx-toolbar"><Switcher label="Fallback rule" options={fallbackChoices} value={fallback}
      onChange={value => { setFallback(value); setResult(null); report() }}/>
      <button type="button" className="primary-button" onClick={evaluate}>Evaluate policy</button></div>
    <TechnicalPath label="Fictional policy evaluation order" nodes={stages.map((stage, index) => {
      const [value, tone] = state(index, stage.result)
      return { ...stage, value, tone, boundary: index === 1 }
    })}/>
    <Feedback title={result ? result.allowed ? 'Operation permitted' : 'Operation refused' : 'Awaiting evaluation'}
      tone={result ? result.allowed && !(result.stop === 'fallback') ? 'trusted' : 'rejected' : 'pending'}>
      {result?.reason ?? 'This policy evaluates verified identity, stored workspace, an explicit allow rule and then the fallback.'}
    </Feedback>
  </div>
}

const failModes = [{ id: 'open', label: 'Use permissive fallback' }, { id: 'closed', label: 'Keep storage closed on uncertainty' }] as const
type Dependency = typeof dependencies[number]['id']

export function FailureLab({ report }: ActivityProps) {
  const [dependency, setDependency] = useState<Dependency>('offline')
  const [mode, setMode] = useState<'open' | 'closed'>('open')
  const [result, setResult] = useState<ReturnType<typeof evaluateFailure> | null>(null)
  const [observations, setObservations] = useState<string[]>([])
  function run() {
    const next = [...observations, mode + '/' + dependency]
    setObservations(next); setResult(evaluateFailure(dependency, mode === 'open'))
    report(next.includes('open/offline') && dependencies.every(test => next.includes('closed/' + test.id)))
  }
  return <div className="mx-canvas pl-workbench pl-failure">
    <LabHeading label="Failure simulator" title="Can an outage open a file?">
      Run a timed-out lookup with the permissive fallback. Switch to the safer policy and test all four dependency states.
    </LabHeading>
    <div className="pl-split">
      <div className="pl-instruments">
        <label>Membership lookup<select value={dependency} onChange={event => {
          setDependency(event.currentTarget.value as Dependency); setResult(null); report()
        }}>{dependencies.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <Switcher label="Failure policy" options={failModes} value={mode} onChange={value => {
          setMode(value); setResult(null); report()
        }}/>
        <button type="button" className="primary-button" onClick={run}>Run failure probe</button>
      </div>
      <dl className="pl-gauge"><div><dt>HTTP response</dt><dd>{result?.status ?? '—'}</dd></div>
        <div><dt>Export stream</dt><dd><Database size={20} aria-hidden="true"/>{result ? result.opens ? 'Opened' : 'Closed' : 'Waiting'}</dd></div></dl>
    </div>
    <Feedback title="Failure probe result" tone={!result ? 'pending' : result.opens && dependency !== 'permit' ? 'rejected' : 'trusted'}>
      {result?.meaning ?? 'Compare the response contract with the storage side effect.'}
    </Feedback>
  </div>
}

const gates = [
  { id: 'ui', label: 'Browser only' }, { id: 'service', label: 'Server check' }, { id: 'layered', label: 'Server + scoped storage' },
] as const
const checks = ['North', 'South', 'Storage isolation test'] as const
type Target = typeof checks[number]

export function EnforcementLab({ report }: ActivityProps) {
  const [gate, setGate] = useState<Enforcement>('ui')
  const [target, setTarget] = useState<Target>('South')
  const [result, setResult] = useState<ReturnType<typeof traceEnforcement> | null>(null)
  const [observations, setObservations] = useState<string[]>([])
  function run() {
    const executed = traceEnforcement(target, gate)
    const next = [...observations, gate + '/' + target]
    setResult(executed); setObservations(next)
    report(next.includes('ui/South') && checks.every(check => next.includes('layered/' + check)))
  }
  return <div className="mx-canvas pl-workbench pl-enforcement">
    <LabHeading label="Enforcement trace" title="Find the missing gate">
      Trace the South fixture with browser-only protection. Add both server safeguards and run North, South and the isolated storage probe.
    </LabHeading>
    <Switcher label="Gate configuration" options={gates} value={gate} onChange={value => { setGate(value); setResult(null); report() }}/>
    <div className="mx-toolbar pl-probe"><Switcher label="Trace fixture" options={checks.map(id => ({ id, label: id }))}
      value={target} onChange={value => { setTarget(value); setResult(null); report() }}/>
      <button type="button" className="primary-button" onClick={run}>Trace request</button></div>
    <TechnicalPath label="Export enforcement path" nodes={[
      { id: 'browser', label: 'Browser', value: target === 'Storage isolation test' ? 'Outside this test' : 'Visibility only', icon: Globe, tone: 'identity' },
      { id: 'api', label: 'API entry', value: target === 'Storage isolation test' ? 'Outside this test' : 'Verified request', icon: Server, tone: 'identity', boundary: true },
      { id: 'service', label: 'Service guard', value: result?.service ?? 'Waiting', icon: ShieldCheck,
        tone: result?.service === 'Blocked' ? 'rejected' : 'pending' },
      { id: 'storage', label: 'Export storage', value: result?.storage ?? 'Waiting', icon: Layers, boundary: true,
        tone: result ? result.exposed ? 'rejected' : 'trusted' : 'quiet' },
    ]}/>
    <Feedback title={result ? result.exposed ? 'Protected data exposed in the model' : 'Model kept the scope boundary' : 'Awaiting trace'}
      tone={result ? result.exposed ? 'rejected' : 'trusted' : 'pending'}>
      {result ? target === 'Storage isolation test' ? 'This isolated regression tests whether storage independently enforces a tenant constraint.' :
        result.exposed ? 'A hidden button changes the UI. The trusted operation still needed its own access check.' :
        target === 'South' ? 'The service denied the cross-workspace request before opening storage.' : 'The authorized North request reached storage.' :
        'Each stage describes the simulated request. This experiment sends no network requests.'}
    </Feedback>
  </div>
}

export function PolicyReleaseReview({ report }: ActivityProps) {
  const [results, setResults] = useState<ReturnType<typeof reviewRelease> | null>(null)
  const passed = results?.every(result => result.passes)
  return <div className="mx-canvas pl-workbench pl-release">
    <LabHeading label="Release review" title="Approve the North download design">
      The new worker only downloads in North. Repair its grants, trusted inputs, policy defaults, failure handling and enforcement.
    </LabHeading>
    <form onChange={() => { setResults(null); report() }} onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const verified = reviewRelease(releaseChecks.map(check => data.get(check.name)?.toString() ?? null))
      setResults(verified); report(verified.every(check => check.passes))
    }}>
      <div className="pl-review">{releaseChecks.map(check => <label key={check.name}>
        {check.label}<select name={check.name} defaultValue={check.options[0]}>{check.options.map(value => <option key={value}>{value}</option>)}</select>
      </label>)}</div>
      <button type="submit" className="primary-button">Run release review</button>
    </form>
    {results && <Feedback title={passed ? 'Release checks passed' : 'Review found unsafe settings'} tone={passed ? 'trusted' : 'rejected'}>
      {passed ? 'North can download. Unlisted actions, other workspaces and an unavailable policy cannot open storage.' :
        'Revisit: ' + results.filter(check => !check.passes).map(check => check.label.toLowerCase()).join(', ') + '.'}
    </Feedback>}
  </div>
}
