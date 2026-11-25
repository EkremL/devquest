import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { Check, Trash2 } from 'lucide-react'
import { DestructiveDialog } from '../../components/DestructiveDialog'
import { ApiError, request } from '../curriculum/api'
import type { SavedAttempt } from './AssessmentHistory'
import { Practice, type Answer, type Feedback, type Paper } from './AssessmentPage'

interface Draft {
  id: string; session: string; paper: Paper; position: string; answers: Answer[]
  guided: Record<string,Feedback>; version: number; createdAt: string; updatedAt: string
}
const post = (body: unknown) => ({
  method:'POST', headers:{'Content-Type':'application/json','X-DevQuest-Request':'1'}, body:JSON.stringify(body)
})
const stamp = (date: string) => new Date(date).toLocaleString()
export function DraftWorkspace() {
  const {sessionId = ''} = useParams()
  return <DraftEntry key={sessionId} session={sessionId}/>
}
function DraftEntry({session}: {session:string}) {
  const path = '/learning/sessions/'+encodeURIComponent(session)+'/assessment/draft'
  const [draft,setDraft] = useState<Draft|null>(null)
  const [open,setOpen] = useState(false)
  const [busy,setBusy] = useState(true)
  const [error,setError] = useState('')
  const load = useCallback(async () => {
    setBusy(true); setError(''); setOpen(false)
    try {setDraft((await request<{draft:Draft|null}>(path)).draft)}
    catch (e) { setError((e as Error).message) }
    finally {setBusy(false)}
  },[path])
  useEffect(()=>{void load()},[load])
  async function start() {
    setBusy(true); setError('')
    try {setDraft(await request<Draft>(path,post({})));setOpen(true)}
    catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }
  const [confirming,setConfirming] = useState(false)
  const [discarding,setDiscarding] = useState(false)
  const [discarded,setDiscarded] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    if(!discarded) return
    startButton.current?.focus()
    const timer=setTimeout(()=>setDiscarded(false),4000)
    return ()=>clearTimeout(timer)
  },[discarded])
  const restoreFocus = useRef(false)
  function cancelDiscard() {
    restoreFocus.current=true
    setConfirming(false)
  }
  useEffect(()=>{
    if(!confirming && trigger.current && restoreFocus.current) {
      trigger.current.focus()
      restoreFocus.current=false
    }
  },[confirming])
  async function discard() {
    if (!draft || discarding) return
    setDiscarding(true)
    try {
      await request(path+'/discard',post({id:draft.id,version:draft.version}))
      setDraft(null)
      setDiscarded(true)
    } catch(e){setError((e as Error).message)}
    finally {setConfirming(false);setDiscarding(false)}
  }
  if(open && draft) return <SavedPractice key={draft.id} initial={draft} path={path} reload={load}/>
  return <section className="assessment as-panel"><h1>{draft?'Resume your assessment':'Session assessment'}</h1>
    {busy ? <p role="status">Loading draft…</p> : error ? <><p role="alert">{error}</p><button onClick={load}>Reload saved draft</button></> :
      draft ? <><p>Release {draft.paper.release} · Last saved {stamp(draft.updatedAt)}</p>
        <div className="dq-draft-actions"><button className="primary-button" onClick={()=>setOpen(true)}>Resume assessment</button>
        <button ref={trigger} className="dq-danger-trigger" aria-haspopup="dialog" onClick={()=>setConfirming(true)}>
          <Trash2 size={15} aria-hidden="true"/>Discard draft</button></div></> :
      <><p>Save your answers and return to the same question later.</p>
        <button ref={startButton} className="primary-button" onClick={start}>Start assessment draft</button></>}
    <Link to={'/learn/'+session+'/assessment/history'}>Past attempts</Link>
    {confirming && <DestructiveDialog title="Discard saved draft?"
      description="This will remove the saved answers, written response, and question position for this assessment draft. This action cannot be undone."
      cancelLabel="Keep draft" confirmLabel="Discard draft" pending={discarding} onCancel={cancelDiscard} onConfirm={discard}/>}
    {discarded && <div className="dq-draft-toast" role="status"><Check size={16} aria-hidden="true"/>Draft discarded</div>}
  </section>
}

export interface DraftControls {
  index:number; answers:Record<string,Answer>; guided:Record<string,Feedback>
  setIndex:(index:number)=>void; setAnswers:(answers:Record<string,Answer>)=>void
  check:(answer:Answer)=>Promise<Feedback>; submit:(rating:string|null)=>Promise<Feedback[]>; restart:()=>void
  busy:boolean; ended:boolean; panel:React.ReactNode
}
function SavedPractice({initial,path,reload}:{initial:Draft;path:string;reload:()=>void}) {
  const confirmed = useRef(initial)
  const [answers,setAnswers] = useState(()=>Object.fromEntries(initial.answers.map(a=>[a.question,a])) as Record<string,Answer>)
  const questions = initial.paper.questions
  const [position,setPosition] = useState(initial.position)
  const index = position==='@review'?questions.length:questions.findIndex(q=>q.id===position)
  const [guided,setGuided] = useState(initial.guided)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [conflict,setConflict] = useState(false)
  const retryAvailable = useRef(true)
  const [retryPending,setRetryPending] = useState(false)
  const [ended,setEnded] = useState(false)
  const flight = useRef(false)
  const dirty = position!==confirmed.current.position || Object.keys(answers).length!==confirmed.current.answers.length ||
    confirmed.current.answers.some(saved=>{
      const local=answers[saved.question]
      return !local || (local.text??'')!==(saved.text??'') || local.choices.join(',')!==saved.choices.join(',')
    })
  const blocker = useBlocker(!ended && (dirty || saving))
  useEffect(()=>{
    if(ended || (!dirty && !saving)) return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return ()=>window.removeEventListener('beforeunload',warn)
  },[dirty,saving,ended])
  useEffect(()=>{if(blocker.state==='blocked' && !dirty && !saving) blocker.proceed()},[blocker,dirty,saving])
  const save = useCallback(async (question?:string) => {
    if(flight.current || conflict || ended) throw new Error('Resolve the pending save first.')
    flight.current=true;setSaving(true);setError('');setRetryPending(false)
    try {
      const draft=confirmed.current
      const next=await request<Draft>(path+(question?'/check/'+encodeURIComponent(question):'/save'),
        post({id:draft.id,version:draft.version,position,answers:Object.values(answers)}))
      confirmed.current=next;setGuided(next.guided);retryAvailable.current=true
      return next
    } catch(e){
      setError((e as Error).message)
      if(e instanceof ApiError && e.status===409)setConflict(true)
      if(!question && retryAvailable.current && e instanceof ApiError && (e.status===0 || e.status>=500)) {
        retryAvailable.current=false
        setRetryPending(true)
      }
      throw e
    } finally {flight.current=false;setSaving(false)}
  },[answers,position,path,conflict,ended])
  useEffect(()=>{
    if(!dirty || saving || (error && !retryPending) || conflict || ended)return
    const timer=setTimeout(()=>void save().catch(()=>{}),retryPending?2000:500)
    return ()=>clearTimeout(timer)
  },[save,dirty,saving,error,ended,retryPending,conflict])
  const navigate=useNavigate()
  async function submit(rating:string|null) {
    const draft=dirty?await save():confirmed.current
    try {
      const result=await request<SavedAttempt>(path+'/submit',post({id:draft.id,version:draft.version,rating}))
      setEnded(true)
      navigate('/learn/'+initial.session+'/assessment/history/'+result.summary.id)
      return result.snapshot.results
    } catch(e){if(e instanceof ApiError && e.status===409)setConflict(true);throw e}
  }
  const retry=()=>void save().catch(()=>{})
  const controls:DraftControls={
    answers,guided,index,setAnswers,setIndex:i=>setPosition(questions[i]?.id??'@review'),
    check:async a=>(await save(a.question)).guided[a.question],submit,restart:reload,busy:saving||conflict,ended,
    panel:<section className="as-controls"><span role="status">{conflict?'Save conflict · Another tab changed this draft.':error?'Save failed · '+error:saving?'Saving…':dirty?'Unsaved changes':'Saved · '+stamp(confirmed.current.updatedAt)}</span>
      {conflict?<button onClick={()=>{if(window.confirm('Replace local edits with the latest saved draft?'))reload()}}>Reload saved draft</button>:
        <button className="secondary-button" disabled={saving||(!dirty&&!error)} onClick={retry}>Save now</button>}
      {blocker.state==='blocked' && <div role="alert">You have pending changes.
        <button onClick={()=>blocker.reset()}>Stay here</button>
        <button disabled={saving} onClick={()=>blocker.proceed()}>Leave with last saved draft</button></div>}
    </section>
  }
  return <Practice paper={initial.paper} session={initial.session} path={path.slice(0,-6)} draft={controls}/>
}
