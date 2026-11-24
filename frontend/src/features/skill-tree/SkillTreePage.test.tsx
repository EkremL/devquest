import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Section, Stats } from '../curriculum/api'
import { SkillTreePage } from './SkillTreePage'
import { buildTree } from './tree'

const empty: Stats = { total: 0, completed: 0, inProgress: 0, needsReview: 0, notStarted: 0, percentage: 0, state: 'NOT_STARTED' }
const topics: Stats = { total: 4, completed: 1, inProgress: 0, needsReview: 1, notStarted: 2, percentage: 25, state: 'IN_PROGRESS' }
const section = (id: string, kind: string, title: string, position: number, children: Section[] = []): Section => ({
  id, parentId: null, kind, title, position, children, items: [],
  statistics: { sessionTopics: topics, moduleRequirements: { ...empty, total: 8 }, finalCompetencies: empty },
})
const first = section('a', 'MODULE', 'Module 0 — Foundations', 1)
const next = section('b', 'MODULE', 'Module 1 — HTTP security', 2, [
  section('session-b', 'SESSION', 'Session 1.1 — Request flow', 3),
])
const final = section('final', 'FINAL_COMPETENCIES', 'Final competencies', 4)
const response = (children: Section[]) => ({ ok: true, json: async () => ({ revisionId: 'rev', root: { children } }) })
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><SkillTreePage /></MemoryRouter></QueryClientProvider>)
  return client
}
beforeEach(() => vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
}))
afterEach(() => vi.unstubAllGlobals())

it('builds branches from source position and uses stable API identities', () => {
  const third = section('c', 'MODULE', 'Module 2', 3)
  const fourth = section('d', 'MODULE', 'Module 3', 4)
  const choose = vi.fn()
  const { nodes, edges } = buildTree([fourth, final, next, first, third], 'b', null, choose, vi.fn())
  expect(nodes.map(node => node.id)).toEqual(['skill-compass', 'a', 'b', 'c', 'd'])
  expect(edges.map(({ source, target }) => [source, target])).toEqual([
    ['a', 'b'], ['b', 'c'], ['c', 'd'],
  ])
})

it('reveals only the selected branch, links to the existing session, and collapses it again', async () => {
  const finished = { ...next.children[0], statistics: {
    ...next.children[0].statistics, sessionTopics: { ...topics, state: 'COMPLETED' as const, percentage: 100 },
  } }
  const module = { ...next, children: [finished] }
  const other = { ...first, children: [section('session-a', 'SESSION', 'Session 0.1 — Setup', 0)] }
  const graph = buildTree([other, module], module.id, module.id, vi.fn(), vi.fn())
  expect(graph.edges.find(edge => edge.target === finished.id)).toMatchObject({ source: module.id, className: 'skill-trail branch lit' })
  expect(graph.nodes.some(node => node.id === 'session-a')).toBe(false)

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([other, module])))
  show()
  const expand = await screen.findByRole('button', { name: `Expand sessions for ${next.title}` })
  expect(screen.queryByRole('link', { name: /^Open Session 1.1/ })).not.toBeInTheDocument()
  fireEvent.click(expand)
  expect(screen.getByRole('link', { name: /^Open Session 1.1/ })).toHaveAttribute('href', '/roadmap/sessions/session-b')
  expect(screen.getByRole('heading', { name: next.title })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: `Expand sessions for ${first.title}` }))
  expect(screen.queryByRole('link', { name: /^Open Session 1.1/ })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /^Open Session 0.1/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: `Collapse sessions for ${first.title}` }))
  expect(screen.queryByRole('link', { name: /^Open Session 0.1/ })).not.toBeInTheDocument()
})

it('selects a module from the keyboard-accessible list and links to its existing session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([next, final, first])))
  show()
  fireEvent.click(await screen.findByText('Browse modules as a list'))
  fireEvent.click(screen.getByRole('button', { name: 'Module 1 — HTTP security 25%' }))
  const detail = screen.getByRole('region', { name: next.title })
  expect(within(detail).getByText('1 / 4 session topics completed')).toBeInTheDocument()
  expect(within(detail).getByText('0 in progress · 1 need review')).toBeInTheDocument()
  expect(within(detail).getByText('Module requirements: 0 / 8 completed')).toBeInTheDocument()
  expect(within(detail).getByRole('link', { name: /Request flow/ })).toHaveAttribute('href', '/roadmap/sessions/session-b')
})

it('updates the selection from a refreshed shared curriculum query without a progress write', async () => {
  const updated = { ...first, statistics: { ...first.statistics, sessionTopics: { ...topics, percentage: 100, completed: 4, needsReview: 0, notStarted: 0, state: 'COMPLETED' as const } } }
  const fetch = vi.fn().mockResolvedValueOnce(response([first])).mockResolvedValueOnce(response([updated]))
  vi.stubGlobal('fetch', fetch)
  const client = show()
  fireEvent.click(await screen.findByRole('button', { name: 'Refresh progress' }))
  expect(await screen.findByText('4 / 4 session topics completed')).toBeInTheDocument()
  expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([['curriculum']])
  expect(fetch.mock.calls.map(([url, options]) => [url, options.method ?? 'GET'])).toEqual([
    ['/api/curriculum', 'GET'], ['/api/curriculum', 'GET'],
  ])
})

it('distinguishes loading, error and an empty curriculum after retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError()).mockResolvedValueOnce(response([final])))
  show()
  expect(screen.getByRole('status')).toHaveTextContent('Loading your skill tree')
  expect(await screen.findByRole('alert')).toHaveTextContent('backend could not be reached')
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading curriculum' }))
  expect(await screen.findByText('This curriculum has no modules yet.')).toBeInTheDocument()
})
