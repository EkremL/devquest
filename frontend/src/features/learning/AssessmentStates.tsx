import { Check, Circle, CircleMinus, Pencil, X } from 'lucide-react'
import type { Answer, Feedback, Question } from './AssessmentPage'

export function AssessmentBadge({ tone, children }: {
  tone: string
  children: string
}) {
  return <span className={'as-badge as-tone-' + tone}>
    {tone === 'correct' && <Check size={14} aria-hidden="true"/>}
    {tone === 'incorrect' && <X size={14} aria-hidden="true"/>}
    {children}
  </span>
}

export function correctSelectionCount(response: Answer | undefined, feedback: Feedback) {
  return feedback.guide.correct.filter(id => response?.choices.includes(id)).length
}

export function questionState(question: Question, response?: Answer, feedback?: Feedback) {
  if (question.type === 'written') return { tone: 'neutral', label: 'Written · self-review', icon: Pencil }
  switch (feedback?.outcome) {
    case 'Correct': return { tone: 'correct', label: 'Correct', icon: Check }
    case 'Incorrect': {
      const matched = correctSelectionCount(response, feedback)
      if (question.type === 'multiple' && matched > 0 && matched < feedback.guide.correct.length) {
        return { tone: 'guided', label: 'Incomplete selection', icon: CircleMinus }
      }
      return { tone: 'incorrect', label: 'Incorrect', icon: X }
    }
    case 'Unanswered': return { tone: 'neutral', label: 'Skipped' }
    default: return response?.choices.length
      ? { tone: 'answered', label: 'Answered · ungraded', icon: Circle }
      : { tone: 'neutral', label: 'Unanswered' }
  }
}

export function QuestionNavigator({ questions, current, busy, answers, guided, results, onSelect }: {
  questions: Question[]
  current?: number
  busy?: boolean
  answers: Record<string, Answer>
  guided: Record<string, Feedback>
  results?: Feedback[]
  onSelect: (index: number) => void
}) {
  return <nav className="as-nav" aria-label={results ? 'Result questions' : 'Assessment questions'}>
    {questions.map((question, index) => {
      const checked = guided[question.id]
      const state = questionState(question, answers[question.id], checked ?? results?.find(item => item.question === question.id))
      const Icon = state.icon
      const label = `Question ${index + 1}, ${state.label.toLowerCase()}${checked ? ", guided practice" : ""}`
      return <button key={question.id} type="button" disabled={busy}
        aria-label={label} title={label}
        aria-current={current === index ? 'step' : undefined}
        onClick={() => onSelect(index)}>
        <strong>{index + 1}</strong>
        {Icon && <Icon size={14} className={'as-nav-icon as-tone-' + state.tone} aria-hidden="true"/>}
        {checked && <span className="as-nav-guided" aria-hidden="true"/>}
      </button>
    })}
  </nav>
}
