import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { Overview } from '../../Overview'
import type { ActivityEntry, Item, ProgressStatus, Section, Stats } from '../curriculum/api'
import { summarize } from './model'

const stats = (total: number, completed: number, inProgress = 0, needsReview = 0): Stats => ({
  total, completed, inProgress, needsReview, notStarted: total - completed - inProgress - needsReview,
  percentage: total ? Math.round(completed / total * 1000) / 10 : 0,
  state: total === completed && total > 0 ? 'COMPLETED' : inProgress || completed ? 'IN_PROGRESS' : needsReview ? 'NEEDS_REVIEW' : 'NOT_STARTED',
})
const item = (id: string, label: string, status: ProgressStatus, position: number): Item => ({
  id, label, position, initiallyCompleted: status === 'COMPLETED',
  progress: { itemId: id, status, version: 0, updatedAt: '', completedAt: null },
})
function fixture() {
  const topicStats = stats(4, 1, 1, 1)
  const statistics = { sessionTopics: topicStats, moduleRequirements: stats(5, 2), finalCompetencies: stats(3, 2) }
  const blank = { parentId: null, position: 0, children: [], items: [], statistics }
  const first: Section = { ...blank, id: 's1', kind: 'SESSION', title: 'Session 0.1 — Setup', items: [
    item('imported', 'Imported completion', 'COMPLETED', 0), item('next', 'Configure the app', 'NOT_STARTED', 1),
    item('review', 'Review request flow', 'NEEDS_REVIEW', 2),
  ] }
  const second: Section = { ...blank, id: 's2', kind: 'SESSION', title: 'Session 0.2 — Security', position: 1,
    items: [item('going', 'Study authentication', 'IN_PROGRESS', 0)] }
  const module: Section = { ...blank, id: 'm1', kind: 'MODULE', title: 'Module 0 — Foundations', children: [second, first] }
  return { curriculumId: 'c', revisionId: 'r', root: { ...blank, id: 'root', kind: 'ROOT', title: 'Curriculum', children: [module] } }
}
const event: ActivityEntry = {
  id: 'event', itemId: 'going', topic: 'Saved authentication transition', fromStatus: 'NOT_STARTED', toStatus: 'IN_PROGRESS',
  occurredAt: '2026-11-24T08:45:00Z', sectionId: 's2', sectionTitle: 'Session 0.2 — Security', sectionKind: 'SESSION',
  moduleId: 'm1', moduleTitle: 'Module 0 — Foundations',
}
const response = (data: unknown) => ({ ok: true, json: async () => data })
function mockApi(curriculum: () => ReturnType<typeof response> | Promise<ReturnType<typeof response>> = () => response(fixture()), activity: ActivityEntry[] = []) {
  const fetch = vi.fn(async (path: string) => {
    if (path === '/api/curriculum') return curriculum()
    if (path === '/api/curriculum/activity') return response(activity)
    return response({ application: 'DevQuest', status: 'UP', database: 'UP', migrations: 'UP' })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}
function show() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Overview /></MemoryRouter>
  </QueryClientProvider>)
}
afterEach(() => vi.unstubAllGlobals())

it('uses server statistics and separates topics, requirements, and competencies', async () => {
  mockApi()
  show()
  const stats = await screen.findByRole('region', { name: 'Learning statistics' })
  expect(within(stats).getByText('25%')).toBeInTheDocument()
  expect(within(stats).getByText('2 / 5')).toBeInTheDocument()
  expect(within(stats).getByText('2 / 3')).toBeInTheDocument()
  expect(within(stats).getByText('Sessions').parentElement).toHaveTextContent('Sessions2')
  const modules = screen.getByRole('region', { name: 'Module progress' })
  const link = within(modules).getByRole('link', { name: /Foundations/ })
  expect(link).toHaveAttribute('href', '/roadmap/modules/m1')
  expect(link).toHaveTextContent('1 / 4 topics')
})

it('prioritizes in progress, then review, then the earliest incomplete topic', () => {
  const { root } = fixture()
  expect(summarize(root).recommendation?.item.id).toBe('going')
  root.children[0].children[0].items[0].progress.status = 'COMPLETED'
  expect(summarize(root).recommendation?.item.id).toBe('review')
  root.children[0].children[1].items[2].progress.status = 'COMPLETED'
  expect(summarize(root).recommendation?.item.id).toBe('next')
  root.children[0].children[1].items[1].progress.status = 'COMPLETED'
  expect(summarize(root).recommendation).toBeUndefined()
})

it('links to actionable sessions and displays real events with saved statuses and time', async () => {
  mockApi(undefined, [event])
  show()
  expect(await screen.findByRole('link', { name: 'Open suggested session' })).toHaveAttribute('href', '/roadmap/sessions/s2')
  const focus = screen.getByRole('region', { name: 'Learning focus' })
  expect(within(focus).getByRole('link', { name: /Study authentication/ })).toHaveAttribute('href', '/roadmap/sessions/s2')
  expect(within(focus).getByRole('link', { name: /Review request flow/ })).toHaveAttribute('href', '/roadmap/sessions/s1')
  const activity = screen.getByRole('region', { name: 'Recent activity' })
  const saved = await within(activity).findByRole('link', { name: /Saved authentication transition/ })
  expect(saved).toHaveTextContent('Not started → In progress')
  expect(saved).toHaveAttribute('href', '/roadmap/sessions/s2')
  expect(saved.querySelector('time')).toHaveAttribute('datetime', event.occurredAt)
  expect(activity).not.toHaveTextContent('Imported completion')
})

it('keeps the activity empty for imported completions and refreshes server values', async () => {
  let value = fixture()
  const fetch = mockApi(() => response(value))
  show()
  expect(await screen.findByText('No recorded activity yet')).toBeInTheDocument()
  expect(screen.queryByText('Imported completion')).not.toBeInTheDocument()
  value = fixture()
  value.root.statistics.sessionTopics = stats(4, 2)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }))
  const region = screen.getByRole('region', { name: 'Learning statistics' })
  expect(await within(region).findByText('50%')).toBeInTheDocument()
  expect(fetch.mock.calls.filter(([path]) => path === '/api/curriculum/activity')).toHaveLength(2)
})

it('shows loading, reports API errors, and can retry the curriculum', async () => {
  let reject!: (reason: Error) => void
  const request = new Promise<never>((_, fail) => { reject = fail })
  let attempted = false
  mockApi(() => {
    if (attempted) return response(fixture())
    attempted = true
    return request
  })
  show()
  expect(await screen.findByText('Loading learning progress…')).toBeInTheDocument()
  reject(new Error('unavailable'))
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be reached')
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading dashboard' }))
  expect(await screen.findByRole('region', { name: 'Learning statistics' })).toBeInTheDocument()
})
