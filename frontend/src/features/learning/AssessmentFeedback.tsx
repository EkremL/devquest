import { useRef } from 'react'
import { BookOpen } from 'lucide-react'
import { AssessmentBadge, correctSelectionCount, QuestionNavigator, questionState } from './AssessmentStates'
import { Link } from 'react-router'
import type { Paper, Question, Answer, Feedback } from './AssessmentPage'

export function assessmentReadingUrl(session: string, paper: Paper, anchor?: string) {
  // The legacy HTTP pilot papers used the published reader before explicit release pins existed.
  const readingRelease = paper.readingRelease ?? (paper.key === 'http-401-and-403' ? 4 : undefined)
  return '/learn/'+encodeURIComponent(session)+'/read'
    +(readingRelease ? '?release='+readingRelease : '')+(anchor ? '#'+anchor : '')
}

export function SelectionFeedback({question, response, feedback}: {question: Question; response?: Answer; feedback: Feedback}) {
  const {guide, outcome} = feedback
  const selected = response?.choices ?? []
  const multiple = question.type === 'multiple'
  const matched = correctSelectionCount(response, feedback)
  const missed = guide.correct.length - matched
  const labels = (ids: string[], answerKey = false) => ids.map(id => {
    const correct = guide.correct.includes(id)
    const tone = correct ? 'correct' : 'incorrect'
    const label = answerKey ? selected.includes(id) ? 'Selected correct option' : selected.length ? 'Missed correct option' : 'Correct option'
      : correct ? 'Selected correct option' : 'Your incorrect selection'
    if (!multiple && (answerKey || correct)) return <li key={id}>{question.choices[id]}</li>
    return <li key={id}><span>{question.choices[id]}</span><AssessmentBadge tone={tone}>{label}</AssessmentBadge></li>
  })
  const differences = Object.keys(question.choices).filter(id => selected.includes(id) !== guide.correct.includes(id))
  return <div className="as-explanation">
    {multiple && selected.length > 0 && <p>
      {matched} of {guide.correct.length} correct options selected · {missed} missed
      {selected.length > matched && ` · ${selected.length - matched} incorrect ${selected.length - matched === 1 ? 'selection' : 'selections'}`}.
      {outcome === 'Incorrect' && ' Full credit requires every correct option and no incorrect options.'}
    </p>}
    <div className="as-answer-pair as-selection-pair"><section><h4>Your answer</h4>{selected.length ? <ul>{labels(selected)}</ul> : <p>Not answered</p>}</section>
      <section><h4>{multiple ? 'Correct answers' : 'Correct answer'}</h4><ul>{labels(guide.correct, true)}</ul></section></div>
    <h4>Why this is correct</h4><p>{guide.reason}</p>
    {outcome === 'Incorrect' && <><h4>Why your answer was incorrect</h4><ul>{differences.map(id =>
      <li key={id}><strong>{question.choices[id]}</strong> · {guide.feedback[id]}</li>)}</ul></>}
    <details><summary>Compare all options</summary><ul>{Object.entries(question.choices).map(([id,label]) => {
      const expected = guide.correct.includes(id)
      const picked = selected.includes(id)
      const status = !multiple ? (expected ? 'Correct answer' : picked ? 'Your incorrect selection' : 'Distractor') : !selected.length ? (expected ? 'Correct option' : 'Distractor') :
        picked ? (expected ? 'Correctly selected' : 'Incorrectly selected') : (expected ? 'Missed correct option' : 'Other unselected option')
      return <li key={id}><strong>{status} · {label}</strong><br/>{guide.feedback[id]}</li>
    })}</ul></details>
  </div>
}

function WrittenReview({feedback,response,historicalRating}: {feedback:Feedback; response?:Answer; historicalRating?:string|null}) {
  return <div className="as-explanation"><h4>Your explanation</h4><p className="as-written">{response?.text || 'Not answered'}</p>
    <h4>Expert model explanation</h4><p>{feedback.guide.reason}</p>
    {historicalRating!==undefined ? <><h4>Self-review rubric</h4><ul>{feedback.guide.rubric.map(line=><li key={line}>{line}</li>)}</ul>
      <p>Self-rating at submission · {historicalRating??'No rating provided'}</p></> : <><fieldset><legend>Self-review rubric</legend><p>Compare your explanation with the model. Mark each criterion your response addresses. These are your own unsaved observations.</p>
      {feedback.guide.rubric.map(line=><label key={line}><input type="checkbox"/>{line}</label>)}</fieldset>
    <label className="as-rating">Your self-review rating (optional)
      <select defaultValue=""><option value="">Choose a rating</option>{['Meets criteria','Partially meets criteria','Needs review'].map(value=><option key={value}>{value}</option>)}</select></label></>}
  </div>
}

export function PracticeResults({paper,results,answers,guided,session,historicalRating}: {
  paper:Paper; results:Feedback[]; answers:Record<string,Answer>; guided:Record<string,Feedback>; session:string; historicalRating?:string|null
}) {
  const headings = useRef<(HTMLHeadingElement | null)[]>([])
  const items = paper.questions.map(question => ({question, feedback:results.find(f=>f.question===question.id)!}))
  const deterministic = items.filter(item=>item.question.type!=='written')
  const written = items.find(item=>item.question.type==='written')!
  function counts(group: typeof items) {
    const independent = group.filter(({question,feedback})=>!guided[question.id] && feedback.outcome!=='Unanswered')
    const correct = independent.filter(({feedback})=>feedback.outcome==='Correct').length
    return {attempted:independent.length,correct,incorrect:independent.length-correct,
      guided:group.filter(({question})=>guided[question.id]).length,
      skipped:group.filter(({feedback})=>feedback.outcome==='Unanswered').length}
  }
  const overall=counts(deterministic)
  return <>
    <QuestionNavigator questions={paper.questions} answers={answers} guided={guided}
      results={results} onSelect={index => headings.current[index]?.focus()}/>
    <section className="as-panel"><h3>Selection questions</h3>
      <p>{deterministic.length} total · {overall.attempted + overall.guided} attempted · {overall.skipped} unanswered</p>
      <div className="as-answer-pair"><section><h4>Independent answers</h4><p>{overall.correct} correct and {overall.incorrect} incorrect among {overall.attempted} independent attempts.</p></section>
        <section><h4>Guided practice</h4><p>{overall.guided} with feedback revealed before submission. Excluded from independent results.</p></section></div>
      <p>Written self-review · {written.feedback.outcome==='Unanswered'?'Not answered':'Response provided'} · No automated score</p></section>
    <section className="as-panel"><h3>Objective review</h3>{Object.entries(paper.objectives).map(([id,title])=>{
      const group=deterministic.filter(({question})=>question.objective===id)
      const c=counts(group)
      const revisit=group.find(({question,feedback})=>!guided[question.id] && feedback.outcome==='Incorrect') ??
        group.find(({feedback})=>feedback.outcome==='Unanswered') ?? group[0]
      return <section key={id} className="as-objective"><h4>{title}</h4>
        <div><AssessmentBadge tone={c.incorrect ? 'incorrect' : c.attempted ? 'correct' : c.guided ? 'guided' : 'neutral'}>
          {c.incorrect ? 'Needs review based on attempted answers' : c.attempted ? 'Correct on attempted questions' : c.guided ? 'Practice feedback revealed' : 'Not assessed yet'}
        </AssessmentBadge></div>
        <div className="as-metrics">
          <AssessmentBadge tone="answered">{c.attempted + ' independent'}</AssessmentBadge>
          <AssessmentBadge tone="correct">{c.correct + ' correct'}</AssessmentBadge>
          <AssessmentBadge tone="incorrect">{c.incorrect + ' incorrect'}</AssessmentBadge>
          <AssessmentBadge tone="neutral">{c.skipped + ' skipped'}</AssessmentBadge>
          <AssessmentBadge tone="guided">{c.guided + ' guided'}</AssessmentBadge>
        </div>
        <p>{revisit.feedback.guide.reason}</p><Link className="as-action" to={assessmentReadingUrl(session,paper,revisit.feedback.guide.anchor)}><BookOpen size={16} aria-hidden="true"/>Revisit this objective</Link></section>
    })}</section>
    {items.map(({question,feedback},i)=>{
      const checked = guided[question.id]
      const state = questionState(question, answers[question.id], checked ?? feedback)
      return <section className="as-panel as-result" key={question.id}>
        <div className="as-metrics">
          <span className="rd-kicker">Question {i+1}</span>
          <AssessmentBadge tone={state.tone}>{state.label}</AssessmentBadge>
          {checked && <AssessmentBadge tone="guided">Guided practice</AssessmentBadge>}
        </div>
        <h3 tabIndex={-1} ref={element => { headings.current[i] = element }}>{question.prompt}</h3>
        <small>{paper.objectives[question.objective]}</small>
        {historicalRating!==undefined && question.sample && <figure className="rd-sample"><figcaption>Question exhibit</figcaption><pre tabIndex={0}>{question.sample}</pre></figure>}
        {question.type==='written'?<WrittenReview historicalRating={historicalRating} feedback={feedback} response={answers[question.id]}/>:
          <SelectionFeedback question={question} response={answers[question.id]} feedback={feedback}/>}
        <Link className="as-action" to={assessmentReadingUrl(session,paper,feedback.guide.anchor)}><BookOpen size={16} aria-hidden="true"/>Review the relevant passage</Link>
      </section>
    })}
  </>
}
