import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { DraftWorkspace } from './DraftWorkspace'
import type { Answer, Feedback } from './AssessmentPage'
import release from '../../../../backend/src/main/resources/assessments/http-401-and-403/3/assessment.json'

beforeEach(()=>{
  // jsdom does not implement top-layer dialog presentation.
  HTMLDialogElement.prototype.showModal=function(){this.open=true}
  HTMLDialogElement.prototype.close=function(){this.open=false}
})

function setup(existing = false) {
  const base = {id:'test-draft',session:'pilot',paper:release.paper,position:'reader-policy',answers:[] as Answer[],
    guided:{} as Record<string,Feedback>,createdAt:'2026-11-25T10:00:00Z',updatedAt:'2026-11-25T10:00:01Z',version:0}
  let active:typeof base|null = existing ? base : null
  let fail = 0
  let writes = 0
  let hold: Promise<void>|undefined
  let resume: (()=>void)|undefined
  const fetcher = vi.spyOn(globalThis,'fetch').mockImplementation(async (url,init)=>{
    if (!init?.method) return Response.json({draft:active})
    const path=String(url)
    const body=JSON.parse(init.body as string)
    if(path.endsWith('/draft')) {active ??= base; return Response.json(active)}
    if(fail) {const status=fail;fail=0;return Response.json({message:'Save error'},{status})}
    if(path.endsWith('/discard')) {active=null;return Response.json({discarded:true})}
    if(!active || body.version!==active.version) return Response.json({message:'Changed'},{status:409})
    writes++
    if(hold){const pending=hold;hold=undefined;await pending}
    active={...active,answers:body.answers,position:body.position,version:active.version+1}
    if(path.endsWith('/check/reader-policy')) active.guided={'reader-policy':{
      question:'reader-policy',outcome:'Correct',guide:release.keys['reader-policy']}}
    return Response.json(active)
  })
  function mount(){
    const router=createMemoryRouter([{path:'/learn/:sessionId/assessment',element:<><Link to="/">Leave workspace</Link><DraftWorkspace/></>},
      {path:'/',element:<h1>Home</h1>}],{initialEntries:['/learn/pilot/assessment']})
    return render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router}/></QueryClientProvider>)
  }
  return {mount,fetcher,pauseNext:()=>{hold=new Promise<void>(resolve=>{resume=resolve})},release:()=>resume?.(),failNext:(status:number)=>{fail=status},writes:()=>writes}
}

it('saves, restores position and guided feedback, and confirms discard', async()=>{
  const test=setup()
  try {
    let view=test.mount()
    fireEvent.click(await screen.findByRole('button',{name:'Start assessment draft'}))
    fireEvent.click(await screen.findByRole('radio',{name:/403 with/}))
    expect(screen.getByText('Unsaved changes')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
    await screen.findByRole('button',{name:'Question 1, correct, guided practice'})
    fireEvent.click(screen.getByRole('button',{name:'Question 2, unanswered'}))
    fireEvent.click(screen.getByRole('radio',{name:/server challenged/}))
    await waitFor(()=>expect(test.writes()).toBe(2))
    view.unmount()
    view=test.mount()
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    expect(screen.getByRole('radio',{name:/server challenged/})).toBeChecked()
    expect(screen.queryByRole('heading',{name:'Correct answer'})).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Question 1, correct, guided practice'}))
    expect(screen.getByRole('radio',{name:/403 with/})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Save now'}))
    await waitFor(()=>expect(test.writes()).toBe(3))
    view.unmount()
    test.mount()
    const discard=await screen.findByRole('button',{name:'Discard draft'})
    fireEvent.click(discard)
    expect(screen.getByRole('button',{name:'Keep draft'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Keep draft'}))
    expect(discard).toHaveFocus()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByText('Draft discarded')).toBeNull()
    fireEvent.click(discard)
    const dialog=screen.getByRole('alertdialog',{name:'Discard saved draft?'})
    fireEvent.click(within(dialog).getByRole('button',{name:'Discard draft'}))
    expect(await screen.findByRole('button',{name:'Start assessment draft'})).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Draft discarded')
  } finally {test.fetcher.mockRestore()}
})

it('warns on navigation, reports save failures and reloads a conflict explicitly',async()=>{
  const test=setup(true)
  try {
    test.mount()
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    fireEvent.click(screen.getByRole('radio',{name:/403 with/}))
    fireEvent.click(screen.getByRole('link',{name:'Leave workspace'}))
    fireEvent.click(await screen.findByRole('button',{name:'Stay here'}))
    test.failNext(503)
    fireEvent.click(screen.getByRole('button',{name:'Save now'}))
    expect(screen.getByText('Saving…')).toBeVisible()
    await screen.findByText(/Save failed/)
    test.failNext(409)
    fireEvent.click(screen.getByRole('button',{name:'Save now'}))
    await screen.findByText(/Save conflict/)
    const reload=screen.getByRole('button',{name:'Reload saved draft'})
    fireEvent.click(reload)
    let dialog=screen.getByRole('dialog',{name:'Reload saved draft?'})
    fireEvent.click(within(dialog).getByRole('button',{name:'Keep local edits'}))
    expect(reload).toHaveFocus()
    expect(screen.getByRole('radio',{name:/403 with/})).toBeChecked()
    fireEvent.click(reload)
    dialog=screen.getByRole('dialog',{name:'Reload saved draft?'})
    fireEvent.click(within(dialog).getByRole('button',{name:'Reload saved draft'}))
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    expect(screen.getByRole('radio',{name:/403 with/})).not.toBeChecked()
  } finally {test.fetcher.mockRestore()}
})

it('keeps newer writing during an in-flight save and retries a transient failure',async()=>{
  const test=setup(true)
  try {
    const view=test.mount()
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    fireEvent.click(screen.getByRole('button',{name:'Question 12, written · self-review'}))
    const text=screen.getByRole('textbox')
    fireEvent.change(text,{target:{value:'First revision'}})
    test.pauseNext()
    fireEvent.click(screen.getByRole('button',{name:'Save now'}))
    fireEvent.change(text,{target:{value:'Second revision'}})
    test.failNext(503)
    test.release()
    await screen.findByText(/Save failed/)
    expect(text).toHaveValue('Second revision')
    await screen.findByText(/^Saved ·/,{}, {timeout:4000})
    view.unmount()
    test.mount()
    fireEvent.click(await screen.findByRole('button',{name:'Resume assessment'}))
    expect(screen.getByRole('textbox')).toHaveValue('Second revision')
  } finally {test.fetcher.mockRestore()}
})
