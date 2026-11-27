import { useState } from 'react'
import { ArrowRight, Eye, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher } from './MissionPrimitives'
import { LabRecord, LabSelect, useTrials } from './TokenLifecycleLab'
import { checkJwt, claims, jwtBaseline, type JwtCase } from './jwtFoundationsModel'
import type { ReportActivity } from './missionIds'

type Props = { report: ReportActivity }
const parts = [{id:'header',label:'Protected header'},{id:'payload',label:'Payload'},{id:'signature',label:'Signature'}] as const
type Part = typeof parts[number]['id']
export function EnvelopeInspector({ report }: Props) {
  const [part,setPart]=useState<Part>('header')
  const [mode,setMode]=useState<'signed'|'encrypted'>('signed')
  const trials=useTrials(['header','payload','signature','encrypted'],report)
  const segments = [
    [parts[0],'Algorithm and type metadata'],
    [parts[1],'Claims about this subject and token'],
    [parts[2],'Integrity evidence over the signed input'],
  ] as const
  return <div className="mx-canvas tl-work jt-work" data-work="envelope">
    <LabHeading label="JWT envelope · conceptual view" title="See which pieces are readable">
      Inspect each part of the signed compact example. Then switch to the encrypted view to compare confidentiality.
    </LabHeading>
    <Switcher label="Envelope view" options={[{id:'signed',label:'Signed JWT'},{id:'encrypted',label:'Encrypted view'}]}
      value={mode} onChange={value=>{setMode(value);report();if(value==='encrypted') trials.record('encrypted')}}/>
    {mode==='signed' ? <>
      <ol className="jt-segments" aria-label="Signed JWT parts">
        {segments.map(([item,description])=><li key={item.id}><button type="button" aria-pressed={part===item.id}
          onClick={()=>{setPart(item.id);trials.record(item.id)}}><strong>{item.label}</strong><small>{description}</small></button></li>)}
      </ol>
      <CodeSample language={part==='signature'?'text':'json'} wrap text={part==='header'?'{"typ":"JWT","alg":"RS256"}':
        part==='payload'?JSON.stringify(claims,null,2):'Signature bytes · omitted in this diagram\nCovers the encoded header and payload.'}/>
    </> : <div className="jt-encrypted"><LockKeyhole aria-hidden="true"/><div><strong>Claims concealed from this observer</strong>
      <p>This is an abstract encrypted view. A compact JWE has a different structure. The receiver needs its configured decryption key.</p></div></div>}
    <Feedback title={mode==='encrypted'?'Confidentiality view':part==='signature'?'Integrity evidence':'Readable representation'} tone="identity">
      {mode==='encrypted'?'Confidentiality is separate from validation and authorization.':part==='signature'?
        'The verifier still needs an approved algorithm and trusted key. A visible signature segment is not proof on its own.':
        'The signed example’s header and payload are encoded with Base64url and can be read without a key.'}
      {' '}{trials.count} / 4 views inspected.
    </Feedback>
  </div>
}

const times=['59','60','299','300'] as const
export function ClaimsBench({ report }: Props) {
  const [time,setTime]=useState<typeof times[number]>('59')
  const [audience,setAudience]=useState<'roster-api'|'audit-api'>('roster-api')
  const [issuer,setIssuer]=useState<'dispatch-lab'|'other-issuer'>('dispatch-lab')
  const [result,setResult]=useState('')
  const trials=useTrials(['early','active','expired','audience','issuer'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work jt-work" data-work="claims">
    <LabHeading label="Claim validation" title="Advance the verifier clock">
      Probe before activation, at activation and at expiration. Compare the result with wrong issuer and wrong audience fixtures.
    </LabHeading>
    <LabRecord values={ [['sub',claims.sub],['iat',claims.iat],['nbf',claims.nbf],['exp',claims.exp]] }/>
    <div className="jt-time" aria-label="Token time boundary sequence">
      <span>Issued · 20</span><ArrowRight size={18} aria-hidden="true"/><span>Usable from · 60</span>
      <ArrowRight size={18} aria-hidden="true"/><span>Expires at · 300</span>
    </div>
    <div className="tl-controls">
      <LabSelect label="Verifier second" value={time} options={times} onChange={value=>{setTime(value);clear()}}/>
      <LabSelect label="Fixture issuer" value={issuer} options={['dispatch-lab','other-issuer']} onChange={value=>{setIssuer(value);clear()}}/>
      <LabSelect label="Fixture audience" value={audience} options={['roster-api','audit-api']} onChange={value=>{setAudience(value);clear()}}/>
      <button className="primary-button" type="button" onClick={()=>{
        const decision=checkJwt({...jwtBaseline,now:Number(time),issuer,audience})
        setResult(decision);report()
        if(decision==='Not active yet') trials.record('early')
        if(decision==='Eligible for authorization'&&time==='60') trials.record('active')
        if(decision==='Expired at verifier') trials.record('expired')
        if(decision==='Audience mismatch') trials.record('audience')
        if(decision==='Issuer mismatch') trials.record('issuer')
      }}>Evaluate claims</button>
    </div>
    <Feedback title={result||'Awaiting a validation probe'} tone={result.startsWith('Eligible')?'trusted':result?'rejected':'pending'}>
      {trials.count} / 5 outcomes. This fixture applies exact seconds with no leeway. Issue time records issuance and is independent of activation.
    </Feedback>
  </div>
}

export function KeyBoundary({ report }: Props) {
  const [scheme,setScheme]=useState<'HS256'|'RS256'>('RS256')
  const [scoped,setScoped]=useState(true)
  const [result,setResult]=useState(false)
  const trials=useTrials(['symmetric','asymmetric'],report)
  return <div className="mx-canvas tl-work jt-work" data-work="keys">
    <LabHeading label="Key distribution" title="Decide what travels to the verifier">
      Compare a shared-secret trust boundary with public-key verification. In each case inspect which services actually receive signing capability.
    </LabHeading>
    <div className="tl-controls">
      <Switcher label="Signing family" options={[{id:'RS256',label:'Asymmetric · RS256'},{id:'HS256',label:'Symmetric · HS256'}]}
        value={scheme} onChange={value=>{setScheme(value);setResult(false);report()}}/>
      <label><input type="checkbox" checked={scoped} onChange={event=>{setScoped(event.target.checked);setResult(false);report()}}/> Keep verifier key access scoped</label>
    </div>
    <div className="tl-network"><div><KeyRound size={23} aria-hidden="true"/>Issuer · {scheme==='HS256'?'shared secret':'private signing key'}</div>
      <ArrowRight size={20} aria-hidden="true"/><div><Eye size={23} aria-hidden="true"/>Resource verifier · {scheme==='HS256'?
        scoped?'same shared secret':'shared secret also exposed to unrelated services':
        scoped?'public verification key':'overbroad access to signing material'}</div></div>
    <button type="button" className="primary-button" onClick={()=>{
      setResult(true);report()
      if(scoped) trials.record(scheme==='HS256'?'symmetric':'asymmetric')
    }}>Review key boundary</button>
    <Feedback title={result?scoped?'Key boundary reviewed':'Signing access is overbroad':'Awaiting key review'} tone={result?scoped?'trusted':'rejected':'pending'}>
      {result&&scheme==='HS256'?'A holder of the shared secret can create the authenticator as well as verify it. Treat every secret holder as a signing trust participant.':
        result?'Give verifiers only trusted public keys. Protect the issuer’s private signing material.':'Switch the scheme to compare which key crosses the boundary.'}
    </Feedback>
  </div>
}

export function VerificationGate({ report }: Props) {
  const [algorithm,setAlgorithm]=useState<JwtCase['algorithm']>('RS256')
  const [verified,setVerified]=useState(true)
  const [result,setResult]=useState('')
  const trials=useTrials(['allowed','mismatch','signature'],report)
  function clear(){setResult('');report()}
  return <div className="mx-canvas tl-work jt-work" data-work="gate">
    <LabHeading label="Algorithm policy" title="Keep verifier policy outside the token">
      This resource accepts only RS256 from its configured issuer. Compare an eligible fixture, an unexpected algorithm and a failed signature.
    </LabHeading>
    <div className="tl-controls"><LabSelect label="Fixture header algorithm" value={algorithm} options={['RS256','HS256']}
      onChange={value=>{setAlgorithm(value);clear()}}/>
      <label><input type="checkbox" checked={verified} onChange={event=>{setVerified(event.target.checked);clear()}}/> Trusted signature result passes</label></div>
    <div className="tl-network"><div><ShieldCheck size={23} aria-hidden="true"/>Allowed algorithm · RS256</div>
      <ArrowRight size={20} aria-hidden="true"/><div>{result||'Policy → signature → claims'}</div></div>
    <button className="primary-button" type="button" onClick={()=>{
      const decision=checkJwt({...jwtBaseline,algorithm,verified})
      setResult(decision)
      trials.record(decision.startsWith('Eligible')?'allowed':decision.startsWith('Algorithm')?'mismatch':'signature')
    }}>Run strict verifier</button>
    <Feedback title={result||'Awaiting strict verification'} tone={result.startsWith('Eligible')?'trusted':result?'rejected':'pending'}>
      This is a defensive model of verifier decisions. It accepts no token strings or keys and performs no cryptographic operations. {trials.count} / 3 comparisons.
    </Feedback>
  </div>
}

export function JwtDesignReview({ report }: Props) {
  const [mode,setMode]=useState<'Local JWT only'|'Central session lookup'>('Local JWT only')
  const [failure,setFailure]=useState<'Allow from cached display state'|'Withhold protected data'>('Allow from cached display state')
  const [result,setResult]=useState<boolean|null>(null)
  function clear(){setResult(null);report()}
  return <div className="mx-canvas tl-work jt-work" data-work="incident">
    <LabHeading label="Design review" title="Choose the state model for instant logout">
      A same-origin staff portal must reject its next protected request immediately after logout. Its central session store is approved, and the proposed JWT-only design has no revocation feed.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Portal design" value={mode} options={['Local JWT only','Central session lookup']} onChange={value=>{setMode(value);clear()}}/>
      <LabSelect label="Missing authoritative state" value={failure} options={['Allow from cached display state','Withhold protected data']}
        onChange={value=>{setFailure(value);clear()}}/>
    </div>
    <button className="primary-button" type="button" onClick={()=>{
      const passes=mode==='Central session lookup'&&failure==='Withhold protected data';setResult(passes);report(passes)
    }}>Review portal design</button>
    {result!==null&&<Feedback title={result?'Portal requirement satisfied':'Policy needs revision'} tone={result?'trusted':'rejected'}>
      {result?'A shared server session can make logout visible on the very next lookup. A JWT-based design would need an additional current-state control for this guarantee.':
        mode==='Local JWT only'?'Local-only verification can still accept a valid credential after logout. Choose architecture based on the revocation requirement.':
        'If the required session lookup fails, its previous display data does not establish current authentication.'}
    </Feedback>}
  </div>
}
