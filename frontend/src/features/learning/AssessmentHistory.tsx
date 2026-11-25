import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { request } from '../curriculum/api'
import type { Answer, Feedback, Paper } from './AssessmentPage'
import { PracticeResults } from './AssessmentFeedback'

interface Summary {
  id:string; key:string; release:number; startedAt:string; submittedAt:string
  correct:number; incorrect:number; guided:number; skipped:number; written:boolean; rating:string|null
}
export interface SavedAttempt {
  summary: Summary
  snapshot: {format:number; paper:Paper; answers:Answer[]; results:Feedback[]; revealed:string[]}
}
const time=(date:string)=>new Date(date).toLocaleString()

export function AssessmentHistory() {
  const {sessionId='',attemptId}=useParams()
  const [search]=useSearchParams()
  const page=Math.max(0,Number.parseInt(search.get('page')??'0',10)||0)
  const workspace='/learn/'+sessionId+'/assessment'
  const api='/learning/sessions/'+sessionId+'/assessment/attempts'
  const listUrl=workspace+'/history'+(page?'?page='+page:'')
  const list=useQuery({queryKey:['attempts',sessionId,page],queryFn:()=>request<Summary[]>(api+'?page='+page),enabled:!attemptId,staleTime:0})
  const detail=useQuery({queryKey:['attempt',sessionId,attemptId],queryFn:()=>request<SavedAttempt>(api+'/'+attemptId),enabled:!!attemptId})
  const heading=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{heading.current?.focus()},[sessionId,attemptId,page])
  const query=attemptId?detail:list
  const result=detail.data
  return <section className="assessment reading-page">
    <nav aria-label="Assessment navigation"><Link to={workspace}>Assessment workspace</Link>
      {attemptId && <> / <Link to={listUrl}>Past attempts</Link></>}</nav>
    <h1 tabIndex={-1} ref={heading}>{attemptId?'Saved assessment result':'Past attempts'}</h1>
    {query.isPending?<p role="status">Loading…</p>:query.isError?<p role="alert">{query.error.message} <button onClick={()=>query.refetch()}>Retry</button></p>:
      attemptId && result ? <>
        <p>Release {result.summary.release} · Submitted {time(result.summary.submittedAt)}</p>
        <PracticeResults paper={result.snapshot.paper} results={result.snapshot.results}
          answers={Object.fromEntries(result.snapshot.answers.map(a=>[a.question,a]))}
          guided={Object.fromEntries(result.snapshot.results.filter(f=>result.snapshot.revealed.includes(f.question)).map(f=>[f.question,f]))}
          session={sessionId} historicalRating={result.summary.rating}/>
        <Link to={workspace}>Return to assessment workspace</Link>
      </> : <>
        {list.data?.length===0 && <p>{page?'No more attempts.':'Your submitted assessments will appear here.'}</p>}
        {list.data?.map(item=><article className="as-panel" key={item.id}>
          <h2>{time(item.submittedAt)}</h2><p>Release {item.release} · {item.correct} independent correct · {item.incorrect} independent incorrect</p>
          <p>{item.guided} guided · {item.skipped} skipped · Written self-review {item.written?'provided':'unanswered'}</p>
          <Link to={workspace+'/history/'+item.id+(page?'?page='+page:'')}>Open result<span className="sr-only"> from {time(item.submittedAt)}</span></Link>
        </article>)}
        <nav className="as-controls" aria-label="History pages">{page>0 && <Link to={'?page='+(page-1)}>Newer attempts</Link>}
          {list.data?.length===20 && <Link to={'?page='+(page+1)}>Older attempts</Link>}</nav>
      </>}
  </section>
}
