import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import type { Section, Stats } from '../curriculum/api'
import { makeAtlas } from './layout'

const stats = (percentage: number): Stats => ({
  percentage, total: 4, completed: percentage/25, state: percentage===100?'COMPLETED':percentage?'IN_PROGRESS':'NOT_STARTED',
  inProgress: 0, notStarted: 4-percentage/25, needsReview: 0,
})
function section(id:string, kind:string, title:string, position:number, children:Section[]=[], percent=0):Section {
  return { id, kind, title, position, children, items:[], parentId:null, statistics:{
    sessionTopics:stats(percent), moduleRequirements:stats(50), finalCompetencies:stats(0),
  }}
}
const session=section('session-id','SESSION','Session 1.1 — Request flow',1,[],75)
const first=section('module-0','MODULE','Module 0 — Setup',0,[],100)
const second=section('module-1','MODULE','Module 1 — Security',1,[session],75)
const envelope=(children=[first,second])=>({ok:true,json:async()=>({curriculumId:'c',revisionId:'r',root:section('root','ROOT','Curriculum',0,children)})})
function show() {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/skill-tree']}><AppRoutes/></MemoryRouter></QueryClientProvider>)
}
beforeEach(()=>{
  vi.stubGlobal('scrollTo',vi.fn())
  vi.stubGlobal('ResizeObserver',class{ observe(){} unobserve(){} disconnect(){} })
})
afterEach(()=>vi.unstubAllGlobals())

it('keeps numbered hub identities and positions while adding a module and session, and follows the actual source order',()=>{
  const original=makeAtlas([first,second])
  const added=section('extra','MODULE','Additional module',2,[section('more','SESSION','Extra session',0)])
  const revised=makeAtlas([{...second,title:'Module 1 — Renamed'},first,added])
  expect(revised.nodes.map(n=>n.id)).toEqual(['module-1','session-id','module-0','extra','more'])
  expect(revised.edges.some(e=>e.source==='module-1'&&e.target==='module-0'&&e.data?.route)).toBe(true)
  expect(revised.edges.some(e=>e.source==='extra'&&e.target==='more'&&!e.data?.route)).toBe(true)
  for(const node of original.nodes)expect(revised.nodes.find(n=>n.id===node.id)?.position).toEqual(node.position)
})

it('opens the real routes from graph and list selection and retains the workspace navigation',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(envelope()))
  show()
  expect(await screen.findByRole('heading',{name:'Skill atlas.'})).toBeInTheDocument()
  const inspector=screen.getByRole('complementary',{name:'Selection details'})
  fireEvent.click(screen.getByRole('button',{name:'Module 1 — Security, In progress'}))
  expect(within(inspector).getByText('75%')).toBeInTheDocument()
  expect(within(inspector).getByText('Module requirements: 2 / 4 complete')).toBeInTheDocument()
  expect(within(inspector).getByRole('link',{name:'Open module'})).toHaveAttribute('href','/roadmap/modules/module-1')
  fireEvent.click(screen.getByRole('button',{name:'Browse'}))
  const browse=screen.getByRole('region',{name:'Browse curriculum'})
  fireEvent.click(within(browse).getByText(second.title))
  fireEvent.click(within(browse).getByRole('button',{name:session.title}))
  expect(browse).not.toBeInTheDocument()
  fireEvent.click(within(inspector).getByRole('link',{name:'Open session'}))
  expect(await screen.findByRole('heading',{name:session.title})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link',{name:'Data safety'}))
  expect(await screen.findByRole('button',{name:'Export Roadmap as Markdown'})).toBeEnabled()
})

it('reads updated progress using the curriculum API and allows returning from focus mode',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(envelope()).mockResolvedValueOnce(envelope([{...first,statistics:{...first.statistics,sessionTopics:stats(50)}},second]))
  vi.stubGlobal('fetch',fetch)
  show()
  const inspector=await screen.findByRole('complementary',{name:'Selection details'})
  expect(within(inspector).getByText('100%')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Focus map'}))
  expect(screen.getByRole('button',{name:'Exit focus'})).toHaveAttribute('aria-pressed','true')
  fireEvent.keyDown(window,{key:'Escape'})
  expect(screen.getByRole('button',{name:'Focus map'})).toHaveAttribute('aria-pressed','false')
  fireEvent.click(screen.getByRole('button',{name:'Refresh progress'}))
  expect(await within(inspector).findByText('50%')).toBeInTheDocument()
  expect(fetch.mock.calls.map(([path, options])=>[path,options.method??'GET'])).toEqual([['/api/curriculum','GET'],['/api/curriculum','GET']])
})

it('shows loading and an actionable error until a retry succeeds',async()=>{
  let fail!: (error: Error)=>void
  vi.stubGlobal('fetch',vi.fn().mockImplementationOnce(()=>new Promise((_,reject)=>{fail=reject})).mockResolvedValueOnce(envelope()))
  show()
  expect(await screen.findByText('Loading curriculum…')).toBeInTheDocument()
  fail(new Error('offline'))
  expect(await screen.findByRole('alert')).toHaveTextContent('backend could not be reached')
  fireEvent.click(screen.getByRole('button',{name:'Retry'}))
  expect(await screen.findByRole('button',{name:'Refresh progress'})).toBeEnabled()
})
