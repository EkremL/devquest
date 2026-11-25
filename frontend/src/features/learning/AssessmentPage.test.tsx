import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, it, vi } from 'vitest'
import { AssessmentPage } from './AssessmentPage'
import active from '../../../../backend/src/main/resources/assessments/http-401-and-403/3/assessment.json'
import authored from '../../../../backend/src/main/resources/assessments/http-401-and-403/2/assessment.json'

it('reviews unanswered questions, submits choices and writing, explains results and resets practice', async () => {
  const posts: RequestInit[] = []
  const fetcher = vi.spyOn(globalThis,'fetch').mockImplementation(async (_url,options)=>{
    let data: unknown = authored.paper
    if(options?.method==='POST'){
      if(String(_url).endsWith('/check')) {
        const [response] = JSON.parse(options.body as string).answers
        expect(response).toEqual({question:'challenge-evidence',choices:['scheme','account']})
        return new Response(JSON.stringify({question:response.question,outcome:'Incorrect',guide:authored.keys['challenge-evidence']}))
      }
      posts.push(options)
      data = authored.paper.questions.map(({id:question},i)=>({question,guide:authored.keys[question as keyof typeof authored.keys],outcome:i===0?'Correct':i===11?'Self-review':i===1?'Incorrect':'Unanswered'}))
    }
    return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})
  })
  try {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/learn/pilot/assessment']}>
      <Routes><Route path="/learn/:sessionId/assessment" element={<AssessmentPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('radio',{name:/403 with/}))
    expect(screen.getByText(/Foundation · Question 1 of 12/)).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Question 4, unanswered'}))
    expect(screen.getByText(/Intermediate · Question 4 of 12/)).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:/Question 1, answered/}))
    fireEvent.click(screen.getByRole('button',{name:'Next question'}))
    fireEvent.click(screen.getByRole('checkbox',{name:/offers Basic/}))
    fireEvent.click(screen.getByRole('checkbox',{name:/existing account/}))
    expect(screen.queryByRole('heading',{name:'Correct answer'})).toBeNull()
    expect(screen.getByRole('button',{name:'Question 2, answered · ungraded'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
    expect(await screen.findByRole('heading',{name:'Feedback revealed · Incomplete selection'})).toBeVisible()
    expect(screen.getByRole('checkbox',{name:/offers Basic.*Correct answer/})).toBeDisabled()
    expect(screen.getByRole('checkbox',{name:/existing account.*Your incorrect selection/})).toBeChecked()
    const correctOptions = screen.getAllByRole('checkbox',{name:/Correct answer/})
    expect(correctOptions).toHaveLength(2)
    expect(correctOptions[1]).not.toBeChecked()
    expect(screen.getByRole('button',{name:'Question 2, incomplete selection, guided practice'})).toBeVisible()
    expect(screen.getByRole('heading',{name:'Correct answers'})).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Previous'}))
    expect(screen.getByRole('radio',{name:/403 with/})).toBeChecked()
    fireEvent.click(screen.getByRole('button',{name:'Question 12, written · self-review'}))
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'Check the challenge before commit.'}})
    fireEvent.click(screen.getByRole('button',{name:'Review answers'}))
    expect(screen.getByText(/3 of 12 answered/)).toBeVisible()
    expect(posts).toHaveLength(0)
    fireEvent.click(screen.getByRole('button',{name:'Submit anyway'}))
    await screen.findByRole('heading',{name:'Practice results'})
    expect(JSON.parse(posts[0].body as string)).toMatchObject({release:2,answers:[
      {question:'reader-policy',choices:['refusal']},{question:'challenge-evidence',choices:['scheme','account']},{question:'regression-plan',text:'Check the challenge before commit.'}
    ]})
    expect(screen.getByText('1 correct and 0 incorrect among 1 independent attempts.')).toBeVisible()
    const navigator = within(screen.getByRole('navigation',{name:'Result questions'}))
    expect(navigator.getByRole('button',{name:'Question 1, correct'})).toBeVisible()
    expect(navigator.getByRole('button',{name:'Question 3, skipped'})).toBeVisible()
    expect(navigator.getByRole('button',{name:'Question 12, written · self-review'})).toBeVisible()
    fireEvent.click(navigator.getByRole('button',{name:'Question 2, incomplete selection, guided practice'}))
    expect(screen.getByRole('heading',{name:authored.paper.questions[1].prompt})).toHaveFocus()
    expect(screen.getByText('Missed correct option')).toBeVisible()
    expect(screen.getByText(/1 of 2 correct options selected · 1 missed · 1 incorrect selection/)).toBeVisible()
    expect(navigator.getByRole('button',{name:'Question 2, incomplete selection, guided practice'})).toHaveTextContent(/^2$/)
    expect(screen.getAllByText('1 independent')[0]).toBeVisible()
    expect(screen.getAllByText('1 guided')[0]).toBeVisible()
    expect(screen.getAllByRole('link',{name:'Revisit this objective'})[0]).toHaveAttribute('href','/learn/pilot/read#study-http-403')
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'Needs review'}})
    expect(screen.getByRole('combobox')).toHaveValue('Needs review')
    expect(screen.getByText('Self-review rubric')).toBeVisible()
    expect(screen.getByText('Check the challenge before commit.')).toBeVisible()
    expect(screen.getByRole('heading',{name:'Objective review'})).toBeVisible()
    expect(screen.getAllByRole('link',{name:'Review the relevant passage'})[0]).toHaveAttribute('href','/learn/pilot/read#study-insufficient-authority')
    fireEvent.click(screen.getByRole('button',{name:'Start new practice'}))
    expect(within(screen.getByRole('group')).getByRole('radio',{name:/403 with/})).not.toBeChecked()
  } finally { fetcher.mockRestore() }
})

it.each([
  { selected: 'challenge', outcome: 'Incorrect', marker: 'Your incorrect selection' },
  { selected: 'refusal', outcome: 'Correct', marker: 'Correct answer' },
])('reveals $outcome single-choice feedback only after checking', async ({ selected, outcome, marker }) => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    if (options?.method === 'POST') {
      expect(JSON.parse(options.body as string).answers).toEqual([{ question: 'reader-policy', choices: [selected] }])
      return Response.json({ question: 'reader-policy', outcome, guide: authored.keys['reader-policy'] })
    }
    return Response.json(authored.paper)
  })
  try {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/learn/pilot/assessment']}>
      <Routes><Route path="/learn/:sessionId/assessment" element={<AssessmentPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    const label = authored.paper.questions[0].choices[selected as 'challenge' | 'refusal']
    const choice = await screen.findByRole('radio', { name: label })
    fireEvent.click(choice)
    expect(screen.getByRole('button', { name: 'Question 1, answered · ungraded' })).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByText(marker)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(await screen.findByRole('button', { name: 'Question 1, ' + outcome.toLowerCase() + ', guided practice' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Correct answer' })).toBeVisible()
    expect(screen.queryByText('Selected correct option')).toBeNull()
    expect(choice).toHaveAccessibleName(label + ' ' + marker)
    expect(choice).toBeChecked()
    expect(choice).toBeDisabled()
    expect(screen.getByRole('radio', { name: /403 with.*Correct answer/ })).toBeInTheDocument()
  } finally { fetcher.mockRestore() }
})

it.each([
  { choices: ['scheme', 'proof'], outcome: 'Correct', status: 'correct', summary: '2 of 2 correct options selected · 0 missed' },
  { choices: ['scheme'], outcome: 'Incorrect', status: 'incomplete selection', summary: '1 of 2 correct options selected · 1 missed' },
  { choices: ['account'], outcome: 'Incorrect', status: 'incorrect', summary: '0 of 2 correct options selected · 2 missed · 1 incorrect selection' },
  { choices: [], outcome: 'Unanswered', status: 'skipped', summary: 'Not answered' },
])('renders multi-select $status in independent results', async ({ choices, outcome, status, summary }) => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    if (options?.method !== 'POST') return Response.json(authored.paper)
    const { answers } = JSON.parse(options.body as string)
    expect(answers).toEqual(choices.length ? [{ question: 'challenge-evidence', choices }] : [])
    return Response.json(authored.paper.questions.map(({id: question}) => ({
      question, outcome: question === 'challenge-evidence' ? outcome : 'Unanswered',
      guide: authored.keys[question as keyof typeof authored.keys],
    })))
  })
  try {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/learn/pilot/assessment']}>
      <Routes><Route path="/learn/:sessionId/assessment" element={<AssessmentPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Question 2, unanswered' }))
    expect(screen.getByText(/Select all that apply/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled()
    const options = authored.paper.questions[1].choices
    for (const id of choices) fireEvent.click(screen.getByRole('checkbox', { name: options[id as keyof typeof options] }))
    fireEvent.click(screen.getByRole('button', { name: 'Question 12, written · self-review' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit anyway' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Question 2, ' + status }))
    const detail = screen.getByRole('heading', {name: authored.paper.questions[1].prompt}).closest('section')!
    expect(within(detail).getByText(new RegExp(summary))).toBeVisible()
    expect(screen.getByText(outcome === 'Correct' ? '1 correct and 0 incorrect among 1 independent attempts.'
      : choices.length ? '0 correct and 1 incorrect among 1 independent attempts.'
      : '0 correct and 0 incorrect among 0 independent attempts.')).toBeVisible()
  } finally { fetcher.mockRestore() }
})

it('renders eleven single-choice questions from release 3 and locks the one checked response', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
    if (options?.method !== 'POST') return Response.json(active.paper)
    expect(JSON.parse(options.body as string)).toEqual({
      key: active.paper.key, release: 3, answers: [{question: 'interpret-challenge', choices: ['offered']}],
    })
    return Response.json({ question: 'interpret-challenge', outcome: 'Correct', guide: active.keys['interpret-challenge'] })
  })
  try {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/learn/pilot/assessment']}>
      <Routes><Route path="/learn/:sessionId/assessment" element={<AssessmentPage/>}/></Routes></MemoryRouter></QueryClientProvider>)
    for (let index = 0; index < 11; index++) {
      fireEvent.click(await screen.findByRole('button', {name: 'Question ' + (index + 1) + ', unanswered'}))
      expect(screen.getAllByRole('radio')).toHaveLength(Object.keys(active.paper.questions[index].choices).length)
      expect(screen.queryByRole('checkbox')).toBeNull()
    }
    fireEvent.click(screen.getByRole('button',{name:'Question 2, unanswered'}))
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[0])
    fireEvent.click(radios[1])
    expect(radios[0]).not.toBeChecked()
    expect(screen.queryByRole('heading',{name:'Correct answer'})).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
    expect(await screen.findByRole('button',{name:'Question 2, correct, guided practice'})).toBeVisible()
    expect(screen.getAllByRole('radio',{name:/Correct answer/})).toHaveLength(1)
    expect(radios[1]).toBeDisabled()
    expect(screen.getByRole('link',{name:'Review the relevant passage'})).toHaveAttribute('href','/learn/pilot/read#http-semantics')
  } finally { fetcher.mockRestore() }
})
