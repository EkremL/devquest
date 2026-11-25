import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { it, expect, vi } from 'vitest'
import { AssessmentHistory } from './AssessmentHistory'
import { DraftWorkspace } from './DraftWorkspace'
import pack from '../../../../backend/src/main/resources/assessments/http-401-and-403/3/assessment.json'

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
    fireEvent.click(screen.getByRole('link',{name:'Past attempts'}))
    await screen.findAllByRole('link',{name:/Open result/})
    fireEvent.click(screen.getByRole('link',{name:'Assessment workspace'}))
    expect(await screen.findByRole('button',{name:'Resume assessment'})).toBeVisible()
  }finally{fetcher.mockRestore()}
})

it('retries a lost submission receipt with the same draft version and opens its durable result',async()=>{
  const operations:unknown[]=[]
  const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,init)=>{
    if(String(url).endsWith('/draft'))return Response.json({draft:active})
    if(String(url).endsWith('/submit')){
      operations.push(JSON.parse(init!.body as string))
      if(operations.length===1)throw new Error('Response lost')
    }
    return Response.json({summary,snapshot})
  })
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(true)
  try{
    mount(base)
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    fireEvent.change(screen.getByRole('combobox'),{target:{value:'Needs review'}})
    fireEvent.click(screen.getByRole('button',{name:'Submit anyway'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry submission')
    fireEvent.click(screen.getByRole('button',{name:'Submit anyway'}))
    await screen.findByRole('heading',{name:'Saved assessment result'})
    expect(await screen.findByText('Inspect both challenge paths.')).toBeVisible()
    expect(operations).toEqual(Array(2).fill({id:'first',version:5,rating:'Needs review'}))
  }finally{confirm.mockRestore();fetcher.mockRestore()}
})
