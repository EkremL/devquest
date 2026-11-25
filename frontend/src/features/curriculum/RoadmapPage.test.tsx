import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useNavigate } from 'react-router'
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
function HistoryControls() {
  const navigate = useNavigate()
  return <><button onClick={() => void navigate(-1)}>Browser back</button><button onClick={() => void navigate(1)}>Browser forward</button></>
}
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => structuredClone(data) })
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('interactive roadmap', () => {
  it('opens authored reading from a bookmarked checklist and returns without writes', async () => {
    const fetch = vi.fn(async (path: string, _options?: RequestInit) => {
      if (path === '/api/learning/catalog') return ok(['session-a'])
      if (path.startsWith('/api/learning/sessions/')) return ok({
        session: { id: 'session-a', title: 'Session 0.1 — Test session', moduleId: 'module-a', moduleTitle: 'Module 0 — Test foundations' },
        key: 'test', release: 1,
        sections: [{ anchor: 'predict-the-response', title: 'Predict the response', objectives: ['Predict the response status.'],
          blocks: [{ kind: 'code', language: 'http', text: 'HTTP/1.1 401 Unauthorized', spans: [] }] }],
      })
      return ok(fixture())
    })
    vi.stubGlobal('fetch', fetch)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/roadmap/sessions/session-a#topic-item-1']}><AppRoutes /><HistoryControls /></MemoryRouter></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('link', { name: 'Read lesson' }))
    const heading = await screen.findByRole('heading', { name: 'Predict the response' })
    fireEvent.click(screen.getByRole('link', { name: 'Predict the response' }))
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByLabelText('Illustrative HTTP message')).toHaveTextContent('401 Unauthorized')
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))
    const topic = (await screen.findByRole('link', { name: 'Second concept' })).closest('li')
    await waitFor(() => expect(topic).toHaveFocus())
    expect(fetch.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)
  })

  it('opens a mapped passage, keeps both chapters mounted and returns to the same item', async () => {
    const fetch = vi.fn(async (path: string, _options?: RequestInit) => {
      if (path.endsWith('/assessment-catalog') || path.endsWith('/catalog')) return ok(['session-a'])
      if (path.endsWith('/topics')) return ok({ 'item-1': 'study-second' })
      if (path.endsWith('/lesson')) return ok({
        session: { id: 'session-a', title: 'Test lesson', moduleId: 'module-a', moduleTitle: 'Test module' },
        key: 'test', release: 4, sections: [
          { anchor: 'first', title: 'First chapter', objectives: ['Compare'], blocks: [] },
          { anchor: 'second', title: 'Second chapter', objectives: ['Explain'], blocks: [
            { kind: 'passage', text: 'study-second', spans: [{ kind: 'text', text: 'Exact explanation' }] },
          ] },
        ],
      })
      return ok(fixture())
    })
    vi.stubGlobal('fetch', fetch)
    mount('/roadmap/sessions/session-a')
    const study = await screen.findByRole('link', { name: 'Study topic: Second concept' })
    expect(study).toHaveAttribute('href', '/learn/session-a/read#study-second')
    const actions = within(screen.getByRole('navigation', { name: 'Learning workspaces' }))
    expect(actions.getByRole('link', { name: 'Read lesson' })).toHaveAttribute('href', '/learn/session-a/read')
    expect(actions.getByRole('link', { name: 'Practice assessment' })).toHaveAttribute('href', '/learn/session-a/assessment')
    const card = within(study.closest('li')!)
    expect(card.getByRole('link', { name: 'Second concept' })).toHaveAttribute('href', '/learn/session-a/read#study-second')
    expect(card.getByText('Topic 02')).toBeVisible()
    expect(card.getByText('Not started', { selector: '.progress-status' })).toBeVisible()
    expect(card.getByText('Self-reported progress', { exact: false })).toBeVisible()
    const select = card.getByRole('combobox', { name: /Status for Second concept/ })
    expect(within(select).getAllByRole('option')).toHaveLength(4)
    fireEvent.change(select, { target: { value: 'NEEDS_REVIEW' } })
    expect(card.getByRole('status')).toHaveTextContent('Unsaved changes')
    expect(card.getByText('Not started', { selector: '.progress-status' })).toBeVisible()
    expect(study).toBeVisible()
    fireEvent.change(select, { target: { value: 'NOT_STARTED' } })
    expect(screen.getByRole('link', { name: 'First concept' })).toHaveAttribute('href', '#topic-item-0')
    expect(screen.getByRole('button', { name: 'Save progress for Second concept' })).toBeDisabled()
    fireEvent.click(study)
    const passage = await screen.findByRole('heading', { name: 'Exact explanation' })
    await waitFor(() => expect(passage).toHaveFocus())
    expect(screen.getByRole('heading', { name: 'First chapter' })).toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: 'First chapter' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'First chapter' })).toHaveFocus())
    expect(passage).toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: 'Return to session checklist' }))
    await waitFor(() => expect(document.getElementById('topic-item-1')).toHaveFocus())
    expect(fetch.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)
  })

  it('keeps the checklist usable when reading is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      if (path === '/api/learning/catalog') return ok([])
      if (path.startsWith('/api/learning/sessions/')) return { ...ok({}), ok: false, status: 404 }
      return ok(fixture())
    }))
    mount('/learn/session-a/read#predict-the-response')
    expect(await screen.findByRole('heading', { name: 'Lesson unavailable' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Back to checklist' }))
    expect(await screen.findByRole('link', { name: 'Second concept' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Read lesson' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Reading not yet available')).toHaveLength(2))
    expect(screen.queryByRole('link', { name: /^Study topic:/ })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Status for Second concept/ })).toBeEnabled()
  })
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
    expect(screen.getByLabelText(/Status for First concept/)).toHaveValue('COMPLETED')
    expect(screen.getByLabelText(/Status for Second concept/)).toHaveValue('NOT_STARTED')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('RoadmapModule 0Session 0.1')
  })
  it('supports direct session and final competency links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(fixture())))
    mount('/roadmap/competencies')
    expect(await screen.findByRole('heading', { name: 'Final Competency Checklist' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Module 0 — Test foundations' })).not.toBeInTheDocument()
  })
  it('focuses a bookmarked topic after the session loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(fixture())))
    mount('/roadmap/sessions/session-a#topic-item-1')
    const topic = (await screen.findByRole('link', { name: 'Second concept' })).closest('li')
    await waitFor(() => expect(topic).toHaveFocus())
  })

  it('keeps navigation active and restores Atlas selection through page history without writing progress', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    const fetch = vi.fn(async (path: string, _options?: RequestInit) => {
      if (path === '/api/curriculum/activity') return ok([])
      if (path === '/api/health') return ok({ application: 'DevQuest', status: 'UP', database: 'UP', migrations: 'UP' })
      return ok(fixture())
    })
    vi.stubGlobal('fetch', fetch)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><AppRoutes /><HistoryControls /></MemoryRouter></QueryClientProvider>)
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }))
    const link = (name: string) => nav.getByRole('link', { name })
    expect(link('Overview')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(await screen.findByRole('link', { name: 'Open suggested session' }))
    await screen.findByRole('heading', { name: 'Session 0.1 — Test session' })
    expect(link('Roadmap')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link('Roadmap'))
    await screen.findByRole('heading', { name: 'Your learning roadmap.' })
    fireEvent.click(link('Skill tree'))
    const node = await screen.findByRole('button', { name: 'Session 0.1 — Test session, In progress' })
    fireEvent.click(node)
    expect(link('Skill tree')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('link', { name: 'Open session' }))
    expect(link('Roadmap')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(await screen.findByRole('button', { name: 'Session 0.1 — Test session, In progress' })).toHaveAttribute('aria-pressed', 'true')
    expect(link('Skill tree')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }))
    await screen.findByRole('heading', { name: 'Session 0.1 — Test session' })
    fireEvent.click(link('Data safety'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export Roadmap as Markdown' })).toBeEnabled())
    expect(link('Data safety')).toHaveAttribute('aria-current', 'page')
    expect(fetch.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)
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
    const select = await screen.findByLabelText(/Status for Second concept/)
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
    fireEvent.change(await screen.findByLabelText(/Status for Second concept/), { target: { value: 'COMPLETED' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save progress for Second concept' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(status === 409 ? 'Conflict:' : 'Update rejected.')
    expect(screen.queryByText('Saved to PostgreSQL.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save progress for Second concept' })).not.toHaveTextContent('Saving'))
  })
})
