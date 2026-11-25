import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { request } from '../curriculum/api'
import { CodeSample } from './CodeSample'
import type { Language } from './api'
import { SelectionFeedback, PracticeResults } from './AssessmentFeedback'
import { AssessmentBadge, QuestionNavigator, questionState } from './AssessmentStates'
import type { DraftControls } from './DraftWorkspace'
import './assessment.css'

export interface Question {
  difficulty: string; id: string; objective: string; type: 'single' | 'multiple' | 'written'
  prompt: string; sample: string; language: Language; choices: Record<string, string>
}
export interface Paper { key: string; release: number; objectives: Record<string,string>; questions: Question[] }
export interface Answer { question: string; choices: string[]; text?: string }
export interface Feedback {
  question: string; outcome: string
  guide: { correct: string[]; reason: string; rubric: string[]; feedback: Record<string,string>; anchor: string }
}
export function AssessmentPage() {
  const { sessionId = '' } = useParams()
  const path = '/learning/sessions/' + encodeURIComponent(sessionId) + '/assessment'
  const query = useQuery({ queryKey: ['assessment', sessionId], queryFn: () => request<Paper>(path), retry: false })
  if (query.isPending) return <p role="status">Loading assessment…</p>
  if (query.isError) return <section><h1>Assessment unavailable</h1><p role="alert">{query.error.message}</p><Link to={'/roadmap/sessions/'+sessionId}>Return to checklist</Link></section>
  return <Practice key={sessionId + ':' + query.data.release} paper={query.data} path={path} session={sessionId}/>
}

export function Practice({paper,path,session,draft}: {paper: Paper; path: string; session: string; draft?:DraftControls}) {
  const [localIndex,setLocalIndex] = useState(0)
  const [localAnswers,setLocalAnswers] = useState<Record<string,Answer>>({})
  const [localGuided,setGuided] = useState<Record<string,Feedback>>({})
  const index=draft?.index ?? localIndex
  const answers=draft?.answers ?? localAnswers
  const guided=draft?.guided ?? localGuided
  const setIndex=draft?.setIndex ?? setLocalIndex
  const setAnswers=draft?.setAnswers ?? setLocalAnswers
  function evaluate<T>(action:string, responses:Answer[]) {
    return request<T>(path+'/'+action, {
      method:'POST', headers:{'Content-Type':'application/json','X-DevQuest-Request':'1'},
      body:JSON.stringify({key:paper.key,release:paper.release,answers:responses})
    })
  }
  const check = useMutation({mutationFn:(response: Answer)=>draft ? draft.check(response) : evaluate<Feedback>('check',[response]),
    onSuccess:feedback=>setGuided(previous=>({...previous,[feedback.question]:feedback})), retry:false})
  const submit = useMutation({mutationFn:()=>draft ? draft.submit() : evaluate<Feedback[]>('submit',Object.values(answers)),retry:false})
  const busy = submit.isPending || check.isPending || !!draft?.busy
  const heading = useRef<HTMLHeadingElement>(null)
  const previousView = useRef('0:false')
  useEffect(() => {
    const view = index + ':' + submit.isSuccess
    if (previousView.current !== view) heading.current?.focus()
    previousView.current = view
  }, [index,submit.isSuccess])
  const q = paper.questions[index]
  const answer = q && answers[q.id]
  const answered = (id:string) => !!(answers[id]?.choices.length || answers[id]?.text?.trim())
  const count = paper.questions.filter(q => answered(q.id)).length
  const checked = q && guided[q.id]
  useEffect(() => {
    if (check.isSuccess) heading.current?.focus({ preventScroll: true })
  }, [check.isSuccess])
  const checkedState = checked && questionState(q, answer, checked)
  const firstUnanswered = paper.questions.findIndex(item=>!answered(item.id))
  const result = submit.data
  return <div className="assessment reading-page">
    <nav aria-label="Session navigation"><Link to={'/roadmap/sessions/'+session}>Session checklist</Link> / <Link to={'/learn/'+session+'/read'}>Reading workspace</Link></nav>
    <header className="rd-hero"><div><p className="rd-kicker">Practice Mode · Session 2.6</p><h1>401 and 403</h1>
      <p>Assessment · {paper.questions.length} questions. {draft ? 'Only server-confirmed draft changes survive closing. Submitted results are temporary.' : 'Attempts are unsaved. Refreshing or leaving clears this practice.'}</p></div></header>
    {draft && !result && draft.panel}
    {result ? <>
      <h2 ref={heading} tabIndex={-1}>Practice results</h2>
      <PracticeResults paper={paper} results={result} answers={answers} guided={guided} session={session}/>
      <button className="primary-button" onClick={()=>{if(draft){draft.restart();return}submit.reset();check.reset();setGuided({});setAnswers({});setIndex(0)}}>Start new practice</button>
    </> : <>
      <p>Use the pilot’s hypothetical Servlet Basic API. Each request starts fresh over HTTPS. The healthy summary endpoint requires TASK_READ. Examples are illustrative.</p>
      <QuestionNavigator questions={paper.questions} current={index} busy={busy}
        answers={answers} guided={guided} onSelect={setIndex}/>
      <section className="as-panel">{q ? <>
        <p className="rd-kicker">{q.difficulty} · Question {index+1} of {paper.questions.length} · {q.type==='written'?'Written self-review':q.type==='multiple'?'Select all that apply':'Select one'}</p>
        <h2 id="question" tabIndex={-1} ref={heading}>{q.prompt}</h2><p>{paper.objectives[q.objective]}</p>
        {q.sample && (q.language === 'text' ? <figure className="rd-sample"><figcaption>Illustrative trace</figcaption><pre tabIndex={0}>{q.sample}</pre></figure> : <CodeSample language={q.language} text={q.sample}/>)}
        {q.type==='multiple' && !checked && <p>Select every correct option and leave the others unchecked.</p>}
        {q.type==='written' ? <textarea aria-labelledby="question" maxLength={4000} rows={7} value={answer?.text??''} onChange={e=>setAnswers({...answers,[q.id]:{question:q.id,choices:[],text:e.target.value}})}/> :
          <fieldset disabled={busy || !!guided[q.id]} aria-labelledby="question">{Object.entries(q.choices).map(([id,label])=>{
            const selected = answer?.choices.includes(id) ?? false
            const tone = checked?.guide.correct.includes(id) ? 'correct' : checked && selected ? 'incorrect' : undefined
            return <label key={id} className={tone ? 'as-choice as-mark-' + tone : 'as-choice'}>
            <input type={q.type==='multiple'?'checkbox':'radio'} name={q.id} checked={selected} onChange={e=>{
              const previous=answer?.choices??[]
              const choices=q.type==='single'?[id]:e.target.checked?[...previous,id]:previous.filter(choice=>choice!==id)
              setAnswers({...answers,[q.id]:{question:q.id,choices}})
            }}/><span>{label}{' '}
              {tone && <AssessmentBadge tone={tone}>{tone === 'correct' ? 'Correct answer' : 'Your incorrect selection'}</AssessmentBadge>}
            </span></label>
          })}</fieldset>}
        {q.type!=='written' && <div className="as-guided">
          {checked && checkedState ? <><h3>Feedback revealed · {checkedState.label}</h3><p>This selection is locked for this practice.</p>
            <SelectionFeedback question={q} response={answer} feedback={guided[q.id]}/><Link to={'/learn/'+session+'/read#'+checked.guide.anchor}>Review the relevant passage</Link></> :
            <><p>Check answer reveals feedback and locks your selection. Checked answers count as guided practice.</p>
            <button className="secondary-button" disabled={!answered(q.id) || busy} onClick={()=>check.mutate(answer)}>Check answer</button></>}
          <span role="status">{check.isPending?'Checking selection…':checkedState?'Guided feedback available. '+checkedState.label+'.':''}</span>
          {check.isError && <p role="alert">{check.error.message}</p>}
        </div>}
        <div className="as-controls"><button className="secondary-button" disabled={busy || index===0} onClick={()=>setIndex(index-1)}>Previous</button>
          <button className="primary-button" disabled={busy} onClick={()=>setIndex(index+1)}>{index===paper.questions.length-1?'Review answers':'Next question'}</button></div>
      </> : <><h2 tabIndex={-1} ref={heading}>Review your answers</h2><p>{count} of {paper.questions.length} answered · {paper.questions.length-count} unanswered · {Object.keys(guided).length} with feedback revealed.</p>
        <p>Written response · {answered(paper.questions.find(item=>item.type==='written')!.id)?'Provided':'Not answered'}. {draft?'Submission ends your saved draft. Results last only on this page.':'This practice is unsaved.'}</p>
        {firstUnanswered>=0 && <p>Unanswered questions will be recorded in this result as skipped.</p>}
        <div className="as-controls">{firstUnanswered>=0 && <button disabled={busy} className="secondary-button" onClick={()=>setIndex(firstUnanswered)}>Return to unanswered questions</button>}
          <button className="primary-button" disabled={busy} onClick={()=>{if(!draft || window.confirm('Submit and end this draft? Results are temporary.'))submit.mutate()}}>{submit.isPending?'Checking answers…':firstUnanswered>=0?'Submit anyway':'Submit Assessment'}</button></div>
        {submit.isError && <p role="alert">{submit.error.message}</p>}</>}</section>
    </>}
    <nav aria-label="Technical references"><a href="https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2">RFC 9110 · HTTP status codes</a> · <a href="https://docs.spring.io/spring-security/reference/7.1/servlet/authentication/passwords/basic.html">Spring Security 7.1 · HTTP Basic</a></nav>
  </div>
}
