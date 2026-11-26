import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { it, expect, vi } from 'vitest'
import { AssessmentHistory } from './AssessmentHistory'
import { DraftWorkspace } from './DraftWorkspace'
import pack from '../../../../backend/src/main/resources/assessments/http-401-and-403/3/assessment.json'
import vocabulary from '../../../../backend/src/main/resources/assessments/identity-and-access-vocabulary/1/assessment.json'

const base='/learn/pilot/assessment'
const summary={id:'first',release:3,key:pack.paper.key,submittedAt:'2026-11-25T10:00:00Z',startedAt:'2026-11-25T09:00:00Z',
  correct:0,incorrect:1,guided:1,skipped:9,written:true,rating:'Needs review'}
const answers=[{question:'reader-policy',choices:['refusal']},{question:'interpret-challenge',choices:['rejected']},
  {question:'regression-plan',choices:[],text:'Inspect both challenge paths.'}]
const results=pack.paper.questions.map(({id:question},i)=>({question,
  guide:pack.keys[question as keyof typeof pack.keys],outcome:i===0?'Correct':i===1?'Incorrect':i===11?'Self-review':'Unanswered'}))
const snapshot={format:1,paper:pack.paper,answers,results,revealed:['reader-policy']}
const active={id:'first',session:'pilot',paper:pack.paper,answers,position:'@review',guided:{'reader-policy':results[0]},
  version:5,createdAt:summary.startedAt,updatedAt:summary.startedAt}

function mount(initial:string){
  const router=createMemoryRouter([
    {path:'/learn/:sessionId/assessment',element:<DraftWorkspace/>},
    {path:'/learn/:sessionId/assessment/history',element:<AssessmentHistory/>},
    {path:'/learn/:sessionId/assessment/history/:attemptId',element:<AssessmentHistory/>},
  ],{initialEntries:[initial]})
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <RouterProvider router={router}/></QueryClientProvider>)
}

it('renders the vocabulary release from its saved result and retains the pinned Reading link', async()=>{
  const paper = vocabulary.paper
  const snapshot = {
    format:1,paper,answers:[],revealed:[],
    results:paper.questions.map(({id})=>({
      question:id,outcome:'Unanswered',guide:vocabulary.keys[id as keyof typeof vocabulary.keys],
    })),
  }
  vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({
    summary:{...summary,key:paper.key,release:paper.release,correct:0,incorrect:0,guided:0,skipped:11,written:false,rating:null},
    snapshot,
  }))
  mount('/learn/vocabulary/assessment/history/first')
  const links = await screen.findAllByRole('link',{name:'Review the relevant passage'})
  expect(links[0]).toHaveAttribute('href','/learn/vocabulary/read?release=4#study-credential')
  expect(links).toHaveLength(12)
  expect(screen.getByRole('heading',{name:paper.questions[0].prompt})).toBeVisible()
})

it('opens historical evidence read-only and returns to the independent draft',async()=>{
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
    expect(init?.method).toBeUndefined()
    if(String(url).endsWith('/draft'))return Response.json({draft:active})
    if(String(url).endsWith('/first'))return Response.json({summary,snapshot})
    return Response.json([{...summary,id:'later',submittedAt:'2026-11-26T10:00:00Z'},summary])
  })
  try {
    mount(base+'/history')
    const links=await screen.findAllByRole('link',{name:/Open result/})
    expect(links[0]).toHaveAttribute('href',base+'/history/later')
    fireEvent.click(links[1])
    expect(await screen.findByText('Inspect both challenge paths.')).toBeVisible()
    expect(screen.getByText('Self-rating at submission · Needs review')).toBeVisible()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    const nav=within(screen.getByRole('navigation',{name:'Result questions'}))
    expect(nav.getByRole('button',{name:'Question 1, correct, guided practice'})).toBeVisible()
    expect(nav.getByRole('button',{name:'Question 2, incorrect'})).toBeVisible()
    expect(nav.getByRole('button',{name:'Question 3, skipped'})).toBeVisible()
    expect(screen.getAllByRole('link',{name:'Review the relevant passage'})[0]).toHaveAttribute('href','/learn/pilot/read#'+results[0].guide.anchor)
    expect(screen.getAllByRole('link',{name:'Revisit this objective'}).every(link=>link.getAttribute('href')?.startsWith('/learn/pilot/read#'))).toBe(true)
    fireEvent.click(screen.getByRole('link',{name:'Past attempts'}))
    await screen.findAllByRole('link',{name:/Open result/})
    fireEvent.click(screen.getByRole('link',{name:'Assessment workspace'}))
    expect(await screen.findByRole('button',{name:'Resume assessment'})).toBeVisible()
  }finally{fetcher.mockRestore()}
})

it('retries a lost submission receipt with the same draft version and opens its durable result',async()=>{
  const operations:unknown[]=[]
  let releaseResponse!:()=>void
  const responseReady=new Promise<void>(resolve=>{releaseResponse=resolve})
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
    if(String(url).endsWith('/draft'))return Response.json({draft:active})
    if(String(url).endsWith('/submit')){
      operations.push(JSON.parse(init!.body as string))
      if(operations.length===1){await responseReady;throw new Error('Response lost')}
    }
    return Response.json({summary,snapshot})
  })
  HTMLDialogElement.prototype.showModal=function(){this.open=true}
  HTMLDialogElement.prototype.close=function(){this.open=false}
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false)
  try{
    mount(base)
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'Needs review'}})
    const submit=screen.getByRole('button',{name:'Submit anyway'})
    const openDialog=()=>{
      fireEvent.click(submit)
      return screen.getByRole('dialog',{name:'Submit assessment?'})
    }
    let dialog=openDialog()
    expect(dialog).toHaveAccessibleDescription(/9 questions are unanswered and will be recorded as skipped\./)
    const keep=within(dialog).getByRole('button',{name:'Continue assessment'})
    expect(keep).toHaveFocus()
    fireEvent.click(keep)
    expect(submit).toHaveFocus()
    dialog=openDialog()
    fireEvent(dialog,new Event('cancel',{cancelable:true,bubbles:true}))
    expect(dialog).not.toBeInTheDocument()
    expect(submit).toHaveFocus()
    expect(operations).toHaveLength(0)
    expect(confirm).not.toHaveBeenCalled()
    dialog=openDialog()
    const confirmButton=within(dialog).getByRole('button',{name:'Submit assessment'})
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)
    await waitFor(()=>expect(operations).toHaveLength(1))
    expect(await within(dialog).findByRole('button',{name:'Submitting…'})).toHaveAttribute('aria-disabled','true')
    releaseResponse()
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry submission')
    await waitFor(()=>expect(submit).toHaveFocus())
    expect(screen.getByRole('combobox')).toHaveValue('Needs review')
    fireEvent.click(within(openDialog()).getByRole('button',{name:'Submit assessment'}))
    await screen.findByRole('heading',{name:'Saved assessment result'})
    expect(await screen.findByText('Inspect both challenge paths.')).toBeVisible()
    expect(operations).toEqual(Array(2).fill({id:'first',version:5,rating:'Needs review'}))
  }finally{confirm.mockRestore();fetcher.mockRestore()}
})
