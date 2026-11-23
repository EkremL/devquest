import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const healthy = { application: 'DevQuest', status: 'UP', database: 'UP', migrations: 'UP' }
afterEach(() => vi.unstubAllGlobals())

describe('workspace connection', () => {
  it('shows actual backend and dependency status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => healthy }))
    render(<App />)
    expect(await screen.findByText('Workspace connected')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Up to date')).toBeInTheDocument()
  })

  it('reports a connection failure and supports retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => healthy })
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be reached')
    expect(screen.queryByText('Connected')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }))
    expect(await screen.findByText('Workspace connected')).toBeInTheDocument()
  })

  it('distinguishes a reachable backend from a failed database', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503,
      json: async () => ({ ...healthy, status: 'DOWN', database: 'DOWN', migrations: 'UNKNOWN' }) }))
    render(<App />)
    expect(await screen.findByText('Reachable')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('dependency is unavailable')
    expect(screen.getByText('Not verified')).toBeInTheDocument()
  })

  it('does not treat an unexpected API payload as healthy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'UP' }) }))
    render(<App />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Workspace connected')).not.toBeInTheDocument()
  })
})
