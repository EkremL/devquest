import { useState } from 'react'
import { ArrowRight, Database, FileKey2, GitBranch, ShieldCheck } from 'lucide-react'
import { CodeSample } from './CodeSample'
import { Feedback, LabHeading, Switcher, TechnicalPath } from './MissionPrimitives'
import { LabRecord, LabSelect, useTrials } from './TokenLifecycleLab'
import { accountStates, daoResult, providerContract, providerRoute, providers, tokenKinds, type AccountState, type TokenKind } from './providerModel'
import type { ReportActivity } from './missionIds'
import './identity-foundations.css'

type Props={report:ReportActivity}
export function ProviderRouter({report}:Props) {
  const [kind,setKind]=useState<TokenKind>(tokenKinds[0])
  const [checked,setChecked]=useState(false)
  const trials=useTrials(tokenKinds,report)
  const selected=providerRoute(kind)
  const failure=kind===tokenKinds[2]
  return <div className="mx-canvas tl-work ic-work pr-work" data-work="provider-routing">
    <LabHeading label="Provider switchboard" title="Send each token to a compatible provider">
      Route three fictional token types through a ProviderManager with DAO first, JWT second and no parent. A selected provider still needs to verify the evidence.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Input token type" value={kind} options={tokenKinds} onChange={value=>{setKind(value);setChecked(false);report()}}/>
      <button type="button" className="primary-button" onClick={()=>{setChecked(true);trials.record(kind)}}>Route token type</button>
    </div>
    <div className="pr-switch">
      <div><GitBranch size={20} aria-hidden="true"/><strong>ProviderManager</strong><span>{kind}</span></div>
      <ol aria-label="Provider trial order">{providers.map((name,i)=><li key={name} data-selected={checked&&selected===name}>
        <strong>{name}</strong><span>{!checked?'Awaiting support check':selected===name?'Compatible fixture provider':i===1&&selected===providers[0]?'Not reached':'Unsupported token type'}</span>
      </li>)}</ol>
    </div>
    <Feedback title={!checked?'Awaiting route':failure?selected:selected+' reached'} tone={!checked?'pending':failure?'rejected':'identity'}>
      {checked&&failure?'Both candidates declined support and no parent was configured.':checked?'The routing trace stops at the compatible provider. Compatibility is not an authentication result.':'Compare supported and unsupported Authentication classes.'} {trials.count} / 3 routes observed.
    </Feedback>
  </div>
}

const fields=['Identity','Account state','Authorities'] as const
const accountData={
  Identity:['getUsername()', '"fixture-user"','The user service found an account projection. No submitted proof has been checked.'],
  'Account state':['isEnabled() / isAccountNonLocked()','true / true','The fixture is eligible to proceed to its verification step.'],
  Authorities:['getAuthorities()','[report:read]','The projection comes from trusted account data. The final token can include other framework authorities.'],
} as const
export function AccountProjection({report}:Props) {
  const [loaded,setLoaded]=useState(false)
  const [field,setField]=useState<typeof fields[number]|null>(null)
  const trials=useTrials(fields,report)
  const detail=field?accountData[field]:null
  return <div className="mx-canvas tl-work ic-work pr-work" data-work="provider-account">
    <LabHeading label="Account projection" title="Inspect what the provider receives from storage">
      Load a fictional account and inspect the identity, account flags and granted authorities supplied to the provider.
    </LabHeading>
    <div className="ic-cabinet"><div className="ic-object">
      <Database size={19} aria-hidden="true"/><strong>UserDetailsService</strong><ArrowRight size={16} aria-hidden="true"/><strong>UserDetails</strong>
      <button type="button" className="secondary-button" disabled={loaded} onClick={()=>{setLoaded(true);report()}}>Load fixture account</button>
      {loaded&&<div className="mx-switcher" role="group" aria-label="Account fields">{fields.map(item=>
        <button type="button" key={item} aria-pressed={field===item} onClick={()=>{setField(item);trials.record(item)}}>{item}</button>)}</div>}
    </div><CodeSample language={detail?'java':'text'} wrap text={detail?detail[0]+'\n'+detail[1]:loaded?'Account projection available':'No account projection loaded'} activeLine={detail?1:undefined}/></div>
    <Feedback title={detail?detail[0]:'Awaiting account inspection'} tone={detail?'identity':'pending'}>
      {detail?detail[2]:'The user service provides data to the provider. It does not verify the submitted password.'} {trials.count} / 3 fields inspected.
    </Feedback>
  </div>
}

const proof=[{id:'matching',label:'Matching proof fixture'},{id:'wrong',label:'Mismatched proof fixture'}] as const
export function PasswordComparison({report}:Props) {
  const [fixture,setFixture]=useState<'matching'|'wrong'>('matching')
  const [compared,setCompared]=useState(false)
  const trials=useTrials(proof.map(item=>item.id),report)
  const match=fixture==='matching'
  return <div className="mx-canvas tl-work ic-work pr-work" data-work="provider-proof">
    <LabHeading label="Encoder bench" title="Compare proof without reproducing the credential">
      Keep the same stored representation. Change the submitted fixture, then observe the synthetic result of PasswordEncoder.matches.
    </LabHeading>
    <Switcher label="Submitted evidence" options={proof} value={fixture} onChange={value=>{setFixture(value);setCompared(false);report()}}/>
    <div className="pr-proof">
      <div><FileKey2 size={19} aria-hidden="true"/><strong>Submitted evidence</strong><span>Fictional value · redacted</span></div>
      <div><Database size={19} aria-hidden="true"/><strong>Stored representation</strong><span>Fixed verifier fixture · redacted</span></div>
      <CodeSample language="java" wrap text={['encoder.matches(submitted, stored);',compared?'// returns '+String(match):'// run the comparison'].join('\n')} activeLine={compared?1:undefined}/>
    </div>
    <button type="button" className="primary-button" onClick={()=>{setCompared(true);trials.record(fixture)}}>Compare password evidence</button>
    <Feedback title={!compared?'Awaiting comparison':match?'Proof matches':'Proof mismatch'} tone={!compared?'pending':match?'trusted':'rejected'}>
      {trials.count} / 2 encoder outcomes. This fixture compares only the password evidence, independently of account eligibility.
    </Feedback>
  </div>
}

export function ProviderOutcome({report}:Props) {
  const [account,setAccount]=useState<AccountState>(accountStates[0])
  const [matches,setMatches]=useState(true)
  const [result,setResult]=useState('')
  const trials=useTrials(['accepted','mismatch','locked','disabled'],report)
  function reset(){setResult('');report()}
  const accepted=result==='Authenticated result returned'
  return <div className="mx-canvas tl-work ic-work pr-work" data-work="provider-outcome">
    <LabHeading label="Terminal outcomes" title="Separate account checks from credential proof">
      Run the active account with matching and mismatched fixtures. Then compare the locked and disabled paths. The model mirrors the relevant DAO checks only.
    </LabHeading>
    <div className="tl-controls">
      <LabSelect label="Fixture account status" value={account} options={accountStates} onChange={value=>{setAccount(value);reset()}}/>
      <label><input type="checkbox" checked={matches} onChange={event=>{setMatches(event.target.checked);reset()}}/> Password fixture matches</label>
    </div>
    <LabRecord values={[
      ['Provider result',result||'Awaiting verification'],
      ['Current principal',accepted?'Caller may install accepted result':result?'No principal established':'Awaiting result'],
      ['Public response',accepted?'Success path':result?'Sign-in failed':'Awaiting result'],
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      const next=daoResult(account,matches)
      setResult(next);trials.record(account==='Active'?matches?'accepted':'mismatch':account.toLowerCase())
    }}>Run DAO checks</button>
    <Feedback title={result||'Awaiting DAO checks'} tone={!result?'pending':accepted?'trusted':'rejected'}>
      {trials.count} / 4 outcomes. Internal diagnostics distinguish these paths. The selected public failure message is consistent.
    </Feedback>
  </div>
}

export function ProviderRelease({report}:Props) {
  const [routing,setRouting]=useState(false)
  const [account,setAccount]=useState(false)
  const [erasure,setErasure]=useState(false)
  const [result,setResult]=useState('')
  function reset(){setResult('');report()}
  return <div className="mx-canvas tl-work ic-work pr-work" data-work="provider-review">
    <LabHeading label="Release investigation" title="Restore the sign-in boundary from three evidence records">
      A provider registration review found missing type routing, omitted eligibility evidence and a credential-retention concern. Apply the corrected contract and verify what each stage establishes.
    </LabHeading>
    <div className="tl-options">
      <label><input type="checkbox" checked={routing} onChange={event=>{setRouting(event.target.checked);reset()}}/> Route password tokens to the DAO provider</label>
      <label><input type="checkbox" checked={account} onChange={event=>{setAccount(event.target.checked);reset()}}/> Preserve DAO account-status checks</label>
      <label><input type="checkbox" checked={erasure} onChange={event=>{setErasure(event.target.checked);reset()}}/> Erase credentials from successful results</label>
    </div>
    <TechnicalPath label="Provider release evidence" nodes={[
      {id:'route',label:'Token routing',value:routing?'Types bound to mechanisms':'Route evidence missing',icon:GitBranch,tone:'identity'},
      {id:'record',label:'Account eligibility',value:account?'State checks present':'Eligibility unverified',icon:Database,tone:'identity'},
      {id:'result',label:'Returned object',value:erasure?'Credentials cleared':'Erasure unverified',icon:ShieldCheck,tone:'identity'},
    ]}/>
    <button type="button" className="primary-button" onClick={()=>{
      const next=providerContract(routing,account,erasure);setResult(next);report(next==='Provider contract verified')
    }}>Verify provider contract</button>
    <Feedback title={result||'Awaiting deployment check'} tone={!result?'pending':result==='Provider contract verified'?'trusted':'rejected'}>
      The provider and manager establish the result. The request integration decides where to associate it, and authorization still evaluates permissions.
    </Feedback>
  </div>
}
