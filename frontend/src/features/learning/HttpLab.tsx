import { useState } from 'react'
import { ArrowDown, ArrowRight, Cable, Globe, LockKeyhole, Radio, Server } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher } from './MissionPrimitives'
import { basicPair, buildRequest, carriers, checkInvestigation, decodeDemoBasic, demoBasic, diagnostics, encodeDemoBasic,
  exchange, investigation, transportState, type Carrier, type Diagnostic } from './httpLabModel'
import type { ReportActivity } from './missionIds'
import './http-lab.css'

type ActivityProps = { report: ReportActivity }

export function RequestBuilder({ report }: ActivityProps) {
  const [carrier, setCarrier] = useState<Carrier>('none')
  const [sent, setSent] = useState<Carrier[]>([])
  const [ran, setRan] = useState(false)
  const request = buildRequest(carrier)
  const selected = carriers.find(item => item.id === carrier)!
  function send() {
    const next = [...sent, carrier]
    setSent(next); setRan(true)
    report(carriers.every(item => next.includes(item.id)))
  }
  return <div className="mx-canvas nl-console">
    <LabHeading label="Network console · local model" title="Follow the credential into the request">
      Switch carriers, inspect the changed bytes and trace each example to its configured receiver. All values are fictional.
    </LabHeading>
    <Switcher label="Request credential carrier" options={carriers} value={carrier} onChange={value => {
      setCarrier(value); setRan(false); report()
    }}/>
    <div className="nl-builder">
      <CodeSample language="http" text={request.text} activeLine={request.activeLine} wrap/>
      <div className="nl-route">
        <span className="mx-label">Request destination</span><strong>{request.method} {request.path}</strong>
        <button type="button" className="primary-button" onClick={send}><Radio size={17} aria-hidden="true"/>Trace delivery</button>
        <p>{new Set(sent).size} / {carriers.length} carriers traced</p>
      </div>
    </div>
    <Feedback title={ran ? selected.receive : 'Ready to trace'} tone={ran ? 'identity' : 'pending'}>
      {ran ? selected.verify : carrier === 'none'
        ? 'This request carries no authentication evidence. Trace it to see where it arrives.'
        : 'The highlighted field or body carries the evidence. It still needs verification before it can establish a caller.'}
    </Feedback>
  </div>
}

const encoding = [
  { id: 'pair', label: 'Readable pair' }, { id: 'bytes', label: 'ASCII bytes' },
  { id: 'encoded', label: 'Base64 / header' }, { id: 'decoded', label: 'Decode' },
] as const
type Encoding = typeof encoding[number]['id']

export function EncodingExplorer({ report }: ActivityProps) {
  const [stage, setStage] = useState<Encoding>('pair')
  const [visited, setVisited] = useState<Encoding[]>([])
  const encoded = encodeDemoBasic()
  const decoded = decodeDemoBasic(encoded)
  const bytes = Array.from(new TextEncoder().encode(basicPair), byte => byte.toString(16).padStart(2, '0')).join(' ')
  function inspect(next: Encoding) {
    const view = [...visited, next]
    setStage(next); setVisited(view)
    report(encoding.every(step => view.includes(step.id)))
  }
  return <div className="mx-canvas nl-encoding">
    <LabHeading label="Basic encoding bench" title="Recover the pair from the header">
      Inspect the pair, its bytes and the outgoing header. Decode the same fixed demonstration value.
    </LabHeading>
    <ol className="nl-steps" aria-label="Credential transformation sequence">
      {encoding.map(({ id, label }, index) => <li key={id}>
        <button type="button" aria-pressed={stage === id} onClick={() => inspect(id)}><span>{index + 1}</span>{label}</button>
        {index < encoding.length - 1 && <ArrowRight size={17} aria-hidden="true"/>}
      </li>)}
    </ol>
    <div className="nl-transform" role="status" aria-atomic="true">
      {stage === 'pair' && <><code><b>{demoBasic.user}</b><mark>:</mark>{demoBasic.password}</code>
        <p>The first colon ends the user identifier. The password may contain a colon. The user identifier cannot.</p></>}
      {stage === 'bytes' && <><code>{bytes}</code><p>Hexadecimal display of the bytes in the fictional ASCII example.</p></>}
      {stage === 'encoded' && <><code>Authorization: Basic {encoded}</code><p>The client sends the Base64 text after the Basic scheme name.</p></>}
      {stage === 'decoded' && <><code>{decoded.user}<mark>:</mark>{decoded.password}</code>
        <p>The original pair is recoverable from the encoded value. Base64 provides no confidentiality.</p></>}
    </div>
  </div>
}

const protocols = [{ id: 'http', label: 'HTTP' }, { id: 'https', label: 'HTTPS' }] as const
type Protocol = typeof protocols[number]['id']
const points = [
  { id:'client', label:'Client', icon:Globe }, { id:'gateway', label:'Gateway', icon:Cable }, { id:'app', label:'Application', icon:Server },
] as const
type Point = typeof points[number]['id']

export function TransportExplorer({ report }: ActivityProps) {
  const [front, setFront] = useState<Protocol>('http')
  const [back, setBack] = useState<Protocol>('http')
  const [point, setPoint] = useState<Point>('client')
  const [seen, setSeen] = useState<string[]>([])
  const transport = transportState(front, back)
  function inspect(next: Point) {
    const observed = [...seen, front + '/' + back + '/' + next]
    setPoint(next); setSeen(observed)
    report(observed.includes('http/http/client') && observed.includes('https/http/gateway') && observed.includes('https/https/app'))
  }
  const details = {
    client: front === 'https' ? 'The client validates the gateway certificate and hostname before sending HTTP over TLS.' :
      'The outgoing HTTP data is readable on that connection. A later redirect cannot undo its exposure.',
    gateway: transport.gateway + '. A second HTTPS connection requires the gateway to validate the application certificate and hostname.',
    app: 'The application sees the decoded HTTP message. In-memory values, logs and stored data need their own protection.',
  }
  return <div className="mx-canvas nl-transport">
    <LabHeading label="Two-hop transport" title="Find where encryption ends">
      Inspect the client with HTTP. Switch the ingress to HTTPS and inspect the gateway. Protect the second hop and inspect the application.
    </LabHeading>
    <div className="nl-dials">
      <div><strong>Client → gateway</strong><Switcher label="Client connection" options={protocols} value={front} onChange={value => {
        setFront(value); report()
      }}/></div>
      <div><strong>Gateway → application</strong><Switcher label="Upstream connection" options={protocols} value={back} onChange={value => {
        setBack(value); report()
      }}/></div>
    </div>
    <ol className="nl-wire" aria-label="Client to gateway to application transport">
      {points.map(({ id, label, icon: Icon }, index) => <li key={id}>
        <button type="button" onClick={() => inspect(id)} aria-pressed={point === id}><Icon size={22} aria-hidden="true"/>{label}</button>
        {index < 2 && <div className="nl-hop" data-tls={index === 0 ? front === 'https' : back === 'https'}>
          <span>{(index === 0 ? front : back) === 'https' && <LockKeyhole size={13} aria-hidden="true"/>}
            {index === 0 ? transport.ingress : transport.downstream}</span>
          <ArrowRight size={20} aria-hidden="true"/><ArrowDown size={16} aria-hidden="true"/>
        </div>}
      </li>)}
    </ol>
    <Feedback title={points.find(item => item.id === point)!.label + ' inspection'}
      tone={transport.protectedHops === 2 ? 'trusted' : 'pending'}>{details[point]}</Feedback>
  </div>
}

const inspectable = carriers.filter(item => item.id !== 'none')
type InspectableCarrier = typeof inspectable[number]['id']
const inspection = {
  basic: { owner: 'Verify a decoded user and password', detail: 'Basic is an HTTP authentication scheme. A Base64 value is readable after decoding.' },
  bearer: { owner: 'Validate token for the target API', detail: 'Bearer tokens can be opaque. Format alone proves neither validity nor permission.' },
  cookie: { owner: 'Look up an opaque session record', detail: 'A cookie carries a value. Here it carries a session identifier. Protect state-changing operations against cross-site request forgery.' },
  login: { owner: 'Parse the login endpoint contract', detail: 'The body follows an application-specific contract. It is separate from HTTP’s Authorization schemes.' },
} as const

export function CarrierInspector({ report }: ActivityProps) {
  const [carrier, setCarrier] = useState<InspectableCarrier>('basic')
  const [choice, setChoice] = useState('')
  const [checked, setChecked] = useState<boolean | null>(null)
  const [verified, setVerified] = useState<InspectableCarrier[]>([])
  const request = buildRequest(carrier)
  function check() {
    const correct = choice === inspection[carrier].owner
    const next = correct ? [...verified, carrier] : verified
    setChecked(correct); setVerified(next)
    report(inspectable.every(item => next.includes(item.id)))
  }
  return <div className="mx-canvas nl-inspect">
    <LabHeading label="Carrier inspector" title="Assign each verifier its job">
      Match every credential representation to the receiver that can validate it.
    </LabHeading>
    <Switcher label="Inspect a carrier" options={inspectable} value={carrier} onChange={value => {
      setCarrier(value); setChecked(null); setChoice(''); report()
    }}/>
    <div className="nl-inspect-work">
      <code>{request.text.split('\n')[request.activeLine!]}</code>
      <label>Verifier responsibility<select value={choice} onChange={event => {
        setChoice(event.currentTarget.value); setChecked(null); report()
      }}><option value="" disabled>Choose a responsibility</option>
        {Object.values(inspection).map(item => <option key={item.owner}>{item.owner}</option>)}
      </select></label>
    </div>
    <button type="button" className="primary-button" disabled={!choice} onClick={check}>Check responsibility</button>
    {checked !== null && <Feedback title={checked ? 'Responsibility matched' : 'Inspect the carrier again'} tone={checked ? 'trusted' : 'rejected'}>
      {inspection[carrier].detail}
    </Feedback>}
  </div>
}

export function ResponseConsole({ report }: ActivityProps) {
  const [scenario, setScenario] = useState<Diagnostic>('challenge')
  const [choice, setChoice] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const [solved, setSolved] = useState<Diagnostic[]>([])
  const trace = exchange(scenario)
  function classify() {
    const correct = choice === trace.next
    const next = correct ? [...solved, scenario] : solved
    setResult(correct); setSolved(next)
    report(diagnostics.every(item => next.includes(item.id)))
  }
  return <div className="mx-canvas nl-console nl-diagnose">
    <LabHeading label="Response diagnostics" title="Choose the next inspection">
      Work through six captured exchanges. Use both the wire response and the service’s sanitized observations.
    </LabHeading>
    <Switcher label="Response case" options={diagnostics} value={scenario} onChange={value => {
      setScenario(value); setChoice(''); setResult(null); report()
    }}/>
    <div className="nl-pair">
      <CodeSample language="http" text={trace.requestText} wrap/>
      <CodeSample language="http" text={trace.responseText} activeLine={1} wrap/>
    </div>
    <dl className="nl-observations">
      <div><dt>Verifier</dt><dd>{trace.verifier}</dd></div><div><dt>Policy</dt><dd>{trace.authority}</dd></div>
    </dl>
    <div className="nl-next">
      <label>Next diagnostic action<select value={choice} onChange={event => {
        setChoice(event.currentTarget.value); setResult(null); report()
      }}><option value="" disabled>Choose an action</option>
        {diagnostics.map(item => <option key={item.id}>{item.next}</option>)}
      </select></label>
      <button type="button" className="primary-button" disabled={!choice} onClick={classify}>Check diagnosis</button>
    </div>
    {result !== null && <Feedback title={result ? 'Diagnosis confirmed' : 'Recheck the response and verifier'} tone={result ? 'trusted' : 'rejected'}>
      {trace.reason}
    </Feedback>}
  </div>
}

const evidenceTabs = [{ id: 'request', label: 'Captured request' }, { id: 'transport', label: 'Gateway trace' },
  { id: 'response', label: 'Captured response' }] as const
type Tab = typeof evidenceTabs[number]['id']

export function HttpInvestigation({ report }: ActivityProps) {
  const [tab, setTab] = useState<Tab>('request')
  const [visited, setVisited] = useState<Tab[]>(['request'])
  const [result, setResult] = useState<number | null>(null)
  const collected = evidenceTabs.every(item => visited.includes(item.id))
  return <div className="mx-canvas nl-brief">
    <LabHeading label="Final incident review" title="The report suddenly asks for sign-in">
      The client changed during a gateway rollout. Inspect all three records and submit a diagnosis that keeps credential values out of logs.
    </LabHeading>
    <Switcher label="Incident evidence" options={evidenceTabs} value={tab} onChange={value => {
      setTab(value); setVisited([...visited, value]); setResult(null); report()
    }}/>
    <div className="nl-incident-evidence" aria-label={evidenceTabs.find(item => item.id === tab)!.label}>
      {tab === 'transport' ? <dl className="nl-observations">
        <div><dt>Client to gateway</dt><dd>HTTPS · certificate and host accepted</dd></div>
        <div><dt>Gateway to API</dt><dd>HTTP · no TLS on this hop</dd></div>
      </dl> : <CodeSample language="http" text={investigation[tab]} activeLine={tab === 'request' ? 2 : 1} wrap/>}
    </div>
    <form onChange={() => { setResult(null); report() }} onSubmit={event => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const mismatch = checkInvestigation(investigation.fields.map(field => data.get(field.name)?.toString() ?? null))
      setResult(collected ? mismatch : -2)
      report(collected && mismatch === -1)
    }}>
      <div className="nl-review-fields">{investigation.fields.map(field => <label key={field.name}>{field.label}
        <select name={field.name} required defaultValue=""><option value="" disabled>Choose…</option>
          {field.options.map(option => <option key={option}>{option}</option>)}
        </select></label>)}</div>
      <button className="primary-button" type="submit">Submit incident diagnosis</button>
    </form>
    {result !== null && <Feedback title={result === -1 ? 'Incident diagnosis confirmed' :
      result === -2 ? 'Collect all three records' : 'Revisit the evidence'} tone={result === -1 ? 'trusted' : 'rejected'}>
      {result === -1 ? 'The cookie reached a Bearer route. The first hop was protected and the downstream hop needs separate review. Verify field presence and scheme at the intended route using redacted diagnostics.' :
        result === -2 ? 'Inspect the request, gateway trace and response before deciding.' : investigation.explanations[result]}
    </Feedback>}
  </div>
}
