import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import { type Curriculum, type Section, type Stats } from './api'

const empty: Stats = { total: 0, completed: 0, inProgress: 0, needsReview: 0, notStarted: 0, percentage: 0, state: 'NOT_STARTED' }
function fixture(): Curriculum {
  const stats = { ...empty, total: 2, completed: 1, notStarted: 1, percentage: 50, state: 'IN_PROGRESS' as const }
  const session: Section = { id: 'session-a', parentId: 'module-a', kind: 'SESSION', title: 'Session 0.1 — Test session', position: 2, children: [],
    statistics: { sessionTopics: stats, moduleRequirements: empty, finalCompetencies: empty },
    items: ['First concept', 'Second concept'].map((label, position) => ({ id: `item-${position}`, label, position, initiallyCompleted: position === 0,
      progress: { itemId: `item-${position}`, status: position === 0 ? 'COMPLETED' : 'NOT_STARTED', version: 0, updatedAt: '2026-11-23T00:00:00Z', completedAt: null } })) }
  const module: Section = { id: 'module-a', parentId: 'root', kind: 'MODULE', title: 'Module 0 — Test foundations', position: 1, children: [session], items: [], statistics: session.statistics }
  const final: Section = { id: 'final', parentId: 'root', kind: 'FINAL_COMPETENCIES', title: 'Final Competency Checklist', position: 3, children: [], items: [], statistics: { sessionTopics: empty, moduleRequirements: empty, finalCompetencies: empty } }
  return { curriculumId: 'test', revisionId: 'revision', sourceSha256: 'test-fixture', root: { id: 'root', parentId: null, kind: 'ROOT', title: 'Test roadmap', position: 0, children: [module, final], items: [], statistics: session.statistics } }
}
function mount(path = '/roadmap') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></QueryClientProvider>)
  return client
}
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => structuredClone(data) })
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('interactive roadmap', () => {
  it('renders backend module counts and navigates to session topics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(fixture())))
    mount()
    expect(await screen.findByRole('link', { name: 'Test foundations' })).toBeInTheDocument()
    const statistics = screen.getByRole('region', { name: 'Completion statistics' })
    expect(within(statistics).getByText('50%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Open Module 0: Test foundations' }))
    expect(await screen.findByRole('heading', { name: 'Module 0 — Test foundations' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Session 0.1 — Test session/ }))
    expect(await screen.findByRole('heading', { name: 'Session 0.1 — Test session' })).toBeInTheDocument()
    expect(screen.getByLabelText('Status for First concept')).toHaveValue('COMPLETED')
    expect(screen.getByLabelText('Status for Second concept')).toHaveValue('NOT_STARTED')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('RoadmapModule 0Session 0.1')
  })
  it('supports direct session and final competency links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(fixture())))
    mount('/roadmap/competencies')
    expect(await screen.findByRole('heading', { name: 'Final Competency Checklist' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Module 0 — Test foundations' })).not.toBeInTheDocument()
  })
  it('shows loading until data arrives', async () => {
    let resolve!: (value: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(r => { resolve = r })))
    mount()
    expect(screen.getByRole('status')).toHaveTextContent('Loading your learning roadmap')
    resolve(ok(fixture()))
    expect(await screen.findByRole('link', { name: 'Test foundations' })).toBeInTheDocument()
  })
  it('shows a failed read and lets the user retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ok(fixture()))
    vi.stubGlobal('fetch', fetch)
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('backend could not be reached')
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading roadmap' }))
    expect(await screen.findByRole('link', { name: 'Test foundations' })).toBeInTheDocument()
  })
  it('saves only after confirmation and refreshes persisted status and statistics', async () => {
    const data = fixture()
    let resolve!: (value: unknown) => void
    const fetch = vi.fn((_path: string, options?: RequestInit) => options?.method === 'PATCH' ? new Promise(r => { resolve = r }) : Promise.resolve(ok(data)))
    vi.stubGlobal('fetch', fetch)
    mount('/roadmap/sessions/session-a')
    const select = await screen.findByLabelText('Status for Second concept')
    fireEvent.change(select, { target: { value: 'IN_PROGRESS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save progress for Second concept' }))
    expect(screen.queryByText('Saved to PostgreSQL.')).not.toBeInTheDocument()
    await waitFor(() => expect(select).toBeDisabled())
    const session = data.root.children[0].children[0]
    session.items[1].progress = { ...session.items[1].progress, status: 'IN_PROGRESS', version: 1 }
    session.statistics.sessionTopics.inProgress = 1
    session.statistics.sessionTopics.notStarted = 0
    resolve(ok(session.items[1].progress))
    expect(await screen.findByText('Saved to PostgreSQL.')).toBeInTheDocument()
    expect(select).toHaveValue('IN_PROGRESS')
    expect(screen.getByText('1 in progress · 0 need review')).toBeInTheDocument()
    const patch = fetch.mock.calls.find(([, options]) => options?.method === 'PATCH')!
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: 'IN_PROGRESS', version: 0 })
    expect(patch[1]!.headers).toEqual({ 'Content-Type': 'application/json', 'X-DevQuest-Request': '1' })
  })
  it.each([409, 500])('handles a %s mutation error without claiming it saved', async status => {
    const data = fixture()
    vi.stubGlobal('fetch', vi.fn((_path: string, options?: RequestInit) => Promise.resolve(options?.method === 'PATCH' ? { ok: false, status, json: async () => ({ message: 'Update rejected.' }) } : ok(data))))
    mount('/roadmap/sessions/session-a')
    fireEvent.change(await screen.findByLabelText('Status for Second concept'), { target: { value: 'COMPLETED' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save progress for Second concept' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 409 ? 'Conflict:' : 'Update rejected.')
    expect(screen.queryByText('Saved to PostgreSQL.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save progress for Second concept' })).not.toHaveTextContent('Saving'))
  })
})
