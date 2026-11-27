import { useState, type ComponentType } from 'react'
import { BadgeCheck, Braces, Clipboard, Fingerprint, Globe, KeyRound, Network, Server, ShieldCheck, UserRound } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath, type PathNode } from './MissionPrimitives'
import { SecurityDecisionPlayground } from './SecurityDecisionPlayground'
import { AccessClock, RefreshLedger, RevocationRoutes, TokenDispatch, TokenIncident } from './TokenLifecycleLab'
import { ClaimsBench, EnvelopeInspector, JwtDesignReview, KeyBoundary, VerificationGate } from './JwtFoundationsLab'
import { DefaultPolicyLab, EnforcementLab, FailureLab, PermissionMatrix, PolicyReleaseReview } from './PolicyLab'
import { CarrierInspector, EncodingExplorer, HttpInvestigation, RequestBuilder, ResponseConsole, TransportExplorer } from './HttpLab'
import { CookieWorkbench, DistributedSessionLab, LogoutLab, RotationExplorer, SessionIncident, SessionTimeMachine, SignInSequence } from './SessionControlLab'
import { FilterPathDebugger, HandlerRouting, MatcherExplorer, MissingChallengeLab, RequestTriage,
  ResponseContractLab, SecurityIncident } from './SecurityResponseLab'
import { MechanismReview, MechanismRoute, StatePlacement, StorageAudit, WithdrawalBench } from './MechanismLab'
import { AuthIncident, ContainmentProbe, ObservabilityAudit, SessionBoundary, SignalTriage } from './ThreatLab'
import { BoundaryTrace, SpringContract, SpringDomain, SpringIdentity, SpringProtection } from './SpringBoundaryLab'
import { ChainRouter, FilterOrder, ObserveChain, ServletCall, ServletDelegates } from './ServletFlowLab'
import type { MissionId, ReportActivity } from './missionIds'
import './missions.css'

const evidenceOptions = [
  { id: 'claim', label: 'Name only' },
  { id: 'valid', label: 'Valid session' },
  { id: 'invalid', label: 'Expired session' },
] as const
type Evidence = typeof evidenceOptions[number]['id']
const evidenceResults = {
  claim: { title: 'No principal established', detail: 'The name selects the claimed account. With no evidence, the verifier cannot bind this request to Maya.', verifier: 'No evidence', principal: 'Not established', tone: 'pending' },
  valid: { title: 'Maya established', detail: 'The verifier matched a current session to Maya. Policy can now evaluate what she may do.', verifier: 'Session accepted', principal: 'Maya', tone: 'trusted' },
  invalid: { title: 'Session rejected', detail: 'An expired session did not establish a caller. The account name is still only a claim.', verifier: 'Session expired', principal: 'Not established', tone: 'rejected' },
} as const

function EvidenceCircuit({ report }: { report: ReportActivity }) {
  const [evidence, setEvidence] = useState<Evidence>('claim')
  const [runs, setRuns] = useState<Evidence[]>([])
  const [observed, setObserved] = useState(false)
  const result = evidenceResults[evidence]
  function verify() {
    const next = [...runs, evidence]
    setRuns(next)
    setObserved(true)
    report(next.includes('valid') && next.includes('invalid'))
  }
  return <div className="mx-canvas mx-evidence">
    <LabHeading label="Evidence circuit" title="Who is actually making this request?">
      Hold Maya’s account name constant. Change the evidence and compare a valid session with an expired one.
    </LabHeading>
    <div className="mx-toolbar">
      <Switcher label="Presented evidence" options={evidenceOptions} value={evidence} onChange={choice => {
        setEvidence(choice); setObserved(false); report()
      }}/>
      <button type="button" className="primary-button" onClick={verify}><Fingerprint size={17} aria-hidden="true"/>Verify evidence</button>
    </div>
    <TechnicalPath label="Claim to authenticated caller" nodes={[
      { id:'claim', label:'Claim', value:'account = Maya', icon:UserRound, tone:'identity' },
      { id:'evidence', label:'Evidence', value:evidenceOptions.find(choice => choice.id === evidence)!.label, icon:KeyRound, tone:'identity' },
      { id:'verifier', label:'Verifier', value:observed ? result.verifier : 'Awaiting check', icon:Fingerprint, tone:observed ? result.tone : 'pending', boundary:true },
      { id:'principal', label:'Caller', value:observed ? result.principal : 'Unresolved', icon:BadgeCheck, tone:observed ? result.tone : 'quiet' },
    ]}/>
    <Feedback title={observed ? result.title : 'Awaiting verification'} tone={observed ? result.tone : 'pending'}>
      {observed ? result.detail : 'The claim and the evidence have reached the verification boundary.'}
    </Feedback>
  </div>
}

const contextOptions = [
  { id:'anonymous', label:'Anonymous request' },
  { id:'human', label:'Browser session' },
  { id:'workload', label:'Scheduled exporter' },
] as const
type Context = typeof contextOptions[number]['id']
const contextDetails = {
  anonymous: {
    Authentication:['AnonymousAuthenticationToken','This illustrative configuration supplies a non-null anonymous token. The token is still anonymous.'],
    Principal:['"anonymousUser"','The configured placeholder does not identify a signed-in person.'],
    Authorities:['[ROLE_ANONYMOUS]','An anonymous authority is not a grant to read protected tasks.'],
  },
  human:{
    Authentication:['UsernamePasswordAuthenticationToken','The illustrative servlet login has established a human account. The browser’s later request restores the session context.'],
    Principal:['UserDetails("Maya")','This configured principal represents Maya. The browser is the client and Maya is the human user.'],
    Authorities:['[ task:read ]','The application can evaluate this grant, followed by the stored workspace.'],
  },
  workload:{
    Authentication:['JwtAuthenticationToken','This example assumes the API already validated a token issued for the scheduled workload.'],
    Principal:['Jwt · sub=nightly-exporter','Here the configured principal is a Jwt. The service is the calling actor and the client on this hop.'],
    Authorities:['[ task:read ]','The example maps a workload grant to task:read. Authority mapping depends on configuration.'],
  },
} as const
type ContextField = keyof typeof contextDetails.anonymous
const fields: ContextField[] = ['Authentication','Principal','Authorities']

function ContextInspector({ report }: { report: ReportActivity }) {
  const [context, setContext] = useState<Context>('anonymous')
  const [field, setField] = useState<ContextField>('Authentication')
  const [visits, setVisits] = useState<string[]>([])
  const [value, detail] = contextDetails[context][field]
  function inspect(next: ContextField) {
    const visited = [...visits, context + '/' + next]
    setField(next)
    setVisits(visited)
    report(visited.includes('anonymous/Principal') && ['human', 'workload'].some(actor =>
      visited.includes(actor + '/Principal') && visited.includes(actor + '/Authorities')))
  }
  return <div className="mx-canvas mx-inspector">
    <LabHeading label="Object inspector" title="What does the application know?">
      Inspect the anonymous principal, then inspect a verified principal and its authorities.
    </LabHeading>
    <Switcher label="Context scenario" options={contextOptions} value={context} onChange={choice => {
      setContext(choice); setField('Authentication'); report()
    }}/>
    <div className="mx-inspector-body">
      <div className="mx-object" role="group" aria-label="SecurityContext fields">
        <div><Braces size={18} aria-hidden="true"/> SecurityContext</div>
        {fields.map(name => <button key={name} type="button" aria-pressed={name === field} onClick={() => inspect(name)}>
          {name}
        </button>)}
      </div>
      <div className="mx-object-value" role="status" aria-atomic="true">
        <span className="mx-label">{field === 'Principal' ? 'getPrincipal()' : field === 'Authorities' ? 'getAuthorities()' : 'getAuthentication()'}</span>
        <code>{value}</code>
        <p>{detail}</p>
      </div>
    </div>
    <p className="mx-footnote">Illustrative Spring Security objects. This inspector reads no DevQuest authentication state.</p>
  </div>
}

function AccessExperiment({ report }: { report: ReportActivity }) {
  const [seen, setSeen] = useState({ allowed:false, blocked:false })
  return <div className="mx-access">
    <p className="mx-instruction">Correctly predict and run an allowed request and a blocked request. Compare the paths.</p>
    <SecurityDecisionPlayground onExperiment={() => report()} onRun={(actual, prediction) => {
      if (actual !== prediction) return
      const next = { allowed:seen.allowed || actual === 200, blocked:seen.blocked || actual !== 200 }
      setSeen(next)
      report(next.allowed && next.blocked)
    }}/>
    <p className="mx-footnote" role="status">Cases verified in this activity: {seen.allowed ? 'allowed observed' : 'allowed pending'} · {seen.blocked ? 'blocked observed' : 'blocked pending'}.</p>
  </div>
}

const steps = [
  { id:'grant', label:'Read grant', line:'contains(', detail:'The action check needs a trusted task:read grant. A matching workspace cannot replace it.' },
  { id:'scope', label:'Workspace match', line:'equals(', detail:'The stored workspace must match the caller’s authorized scope. A read grant alone cannot satisfy this check.' },
  { id:'join', label:'Final decision', line:'return canRead', detail:'Only both true values allow the read. Authentication has already occurred before this policy runs.' },
] as const

export function PolicyWalkthrough({ text }: { text: string }) {
  const [active, setActive] = useState<typeof steps[number]['id']>('grant')
  const [copyStatus, setCopyStatus] = useState('')
  const step = steps.find(item => item.id === active)!
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('Java example copied.')
    } catch {
      setCopyStatus('Clipboard unavailable. You can select and copy the code.')
    }
  }
  return <div className="mx-code">
    <div className="mx-toolbar"><Switcher label="Inspect Java policy" options={steps} value={active} onChange={setActive}/>
      <button type="button" className="secondary-button" onClick={() => void copy()}><Clipboard size={16} aria-hidden="true"/>Copy Java</button>
    </div>
    <div className="mx-footnote" role="status">{copyStatus}</div>
    <CodeSample language="java" text={text} wrap activeLine={text.split('\n').findIndex(line => line.includes(step.line))}/>
    <p role="status">{step.detail}</p>
  </div>
}

const boundaryOptions = [
  { id:'claim', label:'Forwarded JSON name' },
  { id:'validated', label:'Validated session evidence' },
] as const
type Source = typeof boundaryOptions[number]['id']
const boundarySites = [
  { id:'client', label:'Client', icon:Globe },
  { id:'verifier', label:'Evidence verifier', icon:Fingerprint },
  { id:'policy', label:'Policy decision', icon:ShieldCheck },
  { id:'resource', label:'Enforced access', icon:Server },
] as const
const boundaryDetail = {
  client:['Caller input', 'The client can send a name or evidence. Its payload cannot assign itself an identity or a grant.'],
  verifier:['Trust boundary', 'The Task API validates configured evidence for this request. An ordinary JSON name does not establish delegation. A validated session can establish its caller.'],
  policy:['Decision responsibility', 'The policy consumes server-established identity, grant and the stored resource scope. The JSON-only path stops before this decision.'],
  resource:['Enforcement responsibility', 'The resource server must gate the data operation on the decision. These responsibilities can share a single physical application.'],
} as const

function BoundaryExplorer({ report }: { report: ReportActivity }) {
  const [source, setSource] = useState<Source>('claim')
  const [site, setSite] = useState('client')
  const [visited, setVisited] = useState<string[]>([])
  const valid = source === 'validated'
  const values = valid ? ['Session presented','Verified context','Evaluate policy','Enforce result'] : ['Name presented','No trusted evidence','Not reached','Not reached']
  const nodes: PathNode[] = boundarySites.map((node, index) => ({
    ...node, value:values[index], boundary:index === 1,
    tone:index === 0 ? 'identity' : valid ? 'trusted' : index === 1 ? 'rejected' : 'quiet',
  }))
  const [title, detail] = boundaryDetail[site as keyof typeof boundaryDetail]
  function inspect(id: string) {
    setSite(id)
    const next = [...visited, source + '/' + id]
    setVisited(next)
    report(next.includes('claim/verifier') && next.includes('validated/policy') && next.includes('validated/resource'))
  }
  return <div className="mx-canvas mx-boundary">
    <LabHeading label="Architecture explorer" title="Follow what crosses the boundary">
      Inspect the verifier for a JSON name. Switch evidence, then inspect the decision and enforcement stages.
    </LabHeading>
    <Switcher label="Evidence crossing the boundary" options={boundaryOptions} value={source} onChange={choice => {
      setSource(choice); setSite('client'); report()
    }}/>
    <TechnicalPath label="Trust boundary traversal" nodes={nodes} selected={site} onSelect={inspect}/>
    <Feedback title={title} tone={site === 'verifier' && !valid ? 'rejected' : valid ? 'trusted' : 'pending'}>{detail}</Feedback>
  </div>
}

const audit = [
  { id:'deploy', time:'18:42', label:'Deployment', summary:'Maya enabled the export schedule.', detail:'deployment.actor = maya\noperation = enable_schedule' },
  { id:'verify', time:'02:13', label:'Runtime verification', summary:'The API validated the job identity.', detail:'verified.principal = nightly-exporter\nmechanism = workload authentication' },
  { id:'read', time:'02:13', label:'Protected read', summary:'The task read policy allowed the job.', detail:'resource = task:17\nverified.principal = nightly-exporter\ndisplay.actor = maya\ndecision = allow' },
] as const

function AuditInvestigation({ report }: { report: ReportActivity }) {
  const [selected, setSelected] = useState<typeof audit[number]['id']>('deploy')
  const [opened, setOpened] = useState<string[]>([])
  const [finding, setFinding] = useState<'maya'|'job'|null>(null)
  const event = audit.find(item => item.id === selected)!
  const hasEvidence = opened.includes('verify') && opened.includes('read')
  return <div className="mx-canvas mx-audit">
    <LabHeading label="Audit investigation" title="Who read Task 17 at 02:13?">
      The report displays Maya. Open the runtime verification and protected read records. Attribute the operation using their evidence.
    </LabHeading>
    <div className="mx-audit-body">
      <ol className="mx-timeline" aria-label="Sanitized audit event timeline">
        {audit.map(item => <li key={item.id}><button type="button" aria-pressed={selected === item.id} onClick={() => {
          setSelected(item.id); setOpened([...opened,item.id]); setFinding(null); report()
        }}><time>{item.time}</time><strong>{item.label}</strong></button></li>)}
      </ol>
      <div className="mx-log" role="status" aria-atomic="true">
        <p>{event.summary}</p><pre><code>{event.detail}</code></pre>
      </div>
    </div>
    <div className="mx-toolbar mx-verdict" role="group" aria-label="Attribute the protected read">
      <button type="button" className="secondary-button" aria-pressed={finding === 'maya'} onClick={() => {
        setFinding('maya'); report()
      }}>Attribute to Maya</button>
      <button type="button" className="secondary-button" aria-pressed={finding === 'job'} onClick={() => {
        setFinding('job'); report(hasEvidence)
      }}>Attribute to the exporter</button>
    </div>
    {finding && (finding === 'maya'
      ? <Feedback title="Inspect the runtime record again" tone="rejected">The display field carried the deployment actor. The API used the verified runtime principal for the read.</Feedback>
      : hasEvidence
        ? <Feedback title="Runtime attribution resolved" tone="trusted">The exporter was the authenticated caller. Keep Maya’s deployment action as a separate event.</Feedback>
        : <Feedback title="Collect both pieces of runtime evidence" tone="pending">Open the verification and protected read records to support the attribution.</Feedback>)}
  </div>
}

const reviewFields = [
  { name:'caller', label:'Established caller', choices:['Maya','nightly-exporter','No verified caller'] },
  { name:'evidence', label:'Trusted evidence', choices:['Deployment metadata','Validated workload session','Name in the JSON body'] },
  { name:'decision', label:'Policy result', choices:['Allow read','Stop at authentication','Stop at workspace check'] },
] as const
const expectedReview = ['nightly-exporter','Validated workload session','Stop at workspace check']
const reviewReasons = [
  'The audit actor describes deployment. The verified client for this request is the exporter.',
  'Use the verifier’s accepted evidence. Metadata and incoming JSON cannot bind the request to an identity.',
  'The action grant passes. Task 17 is stored in South, outside the exporter’s North scope.',
]

function RequestReview({ report }: { report: ReportActivity }) {
  const [result, setResult] = useState<number | null>(null)
  return <div className="mx-canvas mx-review">
    <LabHeading label="Final request review" title="Decide what gets through">
      Complete the decision record for a scheduled request. The browser exercise ends at the policy boundary.
    </LabHeading>
    <dl className="mx-review-evidence">
      <div><dt>Deployment actor</dt><dd>Maya</dd></div>
      <div><dt>Verifier record</dt><dd>Accepted workload session for nightly-exporter</dd></div>
      <div><dt>Trusted grant and scope</dt><dd>task:read · North</dd></div>
      <div><dt>Stored Task 17 workspace</dt><dd>South</dd></div>
    </dl>
    <form onChange={() => { setResult(null); report() }} onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const mismatch = reviewFields.findIndex((field, index) => data.get(field.name) !== expectedReview[index])
      setResult(mismatch)
      report(mismatch === -1)
    }}>
      <div className="mx-review-fields">{reviewFields.map(field => <label key={field.name}>
        {field.label}
        <select defaultValue="" name={field.name} required><option value="" disabled>Choose…</option>
          {field.choices.map(choice => <option key={choice}>{choice}</option>)}
        </select>
      </label>)}</div>
      <button type="submit" className="primary-button"><Network size={17} aria-hidden="true"/>Validate decision</button>
    </form>
    {result !== null && (result === -1
      ? <Feedback title="Decision record complete" tone="trusted">Verified workload, permitted action, out-of-scope task. Enforce the refusal before any protected data is returned.</Feedback>
      : <Feedback title={'Revisit ' + reviewFields[result].label.toLowerCase()} tone="rejected">{reviewReasons[result]}</Feedback>)}
  </div>
}

const activities = {
  'verify-evidence': EvidenceCircuit,
  'inspect-context': ContextInspector,
  'decide-access': AccessExperiment,
  'trace-boundary': BoundaryExplorer,
  'attribute-request': AuditInvestigation,
  'review-request': RequestReview,
  'build-export-grants': PermissionMatrix,
  'repair-default-policy': DefaultPolicyLab,
  'simulate-policy-failure': FailureLab,
  'trace-export-enforcement': EnforcementLab,
  'review-export-release': PolicyReleaseReview,
  'build-http-request': RequestBuilder,
  'inspect-basic-encoding': EncodingExplorer,
  'trace-http-transport': TransportExplorer,
  'inspect-http-carriers': CarrierInspector,
  'diagnose-http-response': ResponseConsole,
  'investigate-http-incident': HttpInvestigation,
  'follow-session-signin': SignInSequence,
  'inspect-session-cookie': CookieWorkbench,
  'advance-session-clock': SessionTimeMachine,
  'trace-shared-session': DistributedSessionLab,
  'rotate-session-id': RotationExplorer,
  'verify-session-logout': LogoutLab,
  'investigate-session-incident': SessionIncident,
  'triage-security-request': RequestTriage,
  'trace-security-filters': FilterPathDebugger,
  'route-security-handler': HandlerRouting,
  'repair-security-response': ResponseContractLab,
  'match-security-rule': MatcherExplorer,
  'debug-lab-challenge': MissingChallengeLab,
  'investigate-security-incident': SecurityIncident,
  'dispatch-token-pair': TokenDispatch,
  'validate-token-window': AccessClock,
  'compare-token-revocation': RevocationRoutes,
  'rotate-refresh-family': RefreshLedger,
  'resolve-token-contract': TokenIncident,
  'inspect-jwt-envelope': EnvelopeInspector,
  'evaluate-jwt-claims': ClaimsBench,
  'compare-jwt-keys': KeyBoundary,
  'verify-jwt-policy': VerificationGate,
  'review-jwt-architecture': JwtDesignReview,
  'route-mechanism': MechanismRoute,
  'probe-withdrawal': WithdrawalBench,
  'trace-mechanism-state': StatePlacement,
  'audit-mechanism-storage': StorageAudit,
  'review-mechanism-choice': MechanismReview,
  'triage-auth-signals': SignalTriage,
  'verify-session-boundary': SessionBoundary,
  'review-auth-observability': ObservabilityAudit,
  'probe-auth-containment': ContainmentProbe,
  'confirm-auth-incident': AuthIncident,
  'cross-spring-boundary': BoundaryTrace,
  'inspect-spring-evidence': SpringIdentity,
  'compare-spring-protections': SpringProtection,
  'audit-spring-policy': SpringDomain,
  'review-spring-boundary': SpringContract,
  'follow-servlet-call': ServletCall,
  'inspect-servlet-delegates': ServletDelegates,
  'route-servlet-chain': ChainRouter,
  'order-servlet-observer': FilterOrder,
  'confirm-servlet-evidence': ObserveChain,
} satisfies Record<MissionId, ComponentType<{ report: ReportActivity }>>

export function MissionActivity({ id, report }: { id: MissionId; report: ReportActivity }) {
  const Activity = activities[id]
  return <Activity report={report}/>
}
