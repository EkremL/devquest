import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataSafetyPage } from './DataSafetyPage'

const count = { total: 2, completed: 1 }
const curriculum = { curriculumId: 'curriculum-a', revisionId: 'revision-a', root: { title: 'Test curriculum', statistics: { sessionTopics: count, moduleRequirements: { total: 0, completed: 0 }, finalCompetencies: { total: 0, completed: 0 } } } }
const metadata = { ok: true, json: async () => curriculum }
const file = () => ({ ok: true, headers: new Headers({ 'Content-Type': 'text/markdown;charset=UTF-8' }), blob: async () => new Blob(['# Test\r\n- [x] Done\r\n'], { type: 'text/markdown' }) })
let clicks: { href: string; download: string }[]
beforeEach(() => {
  clicks = []
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-export')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicks.push({ href: this.href, download: this.download }) })
})
afterEach(() => vi.unstubAllGlobals())
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><DataSafetyPage /></MemoryRouter></QueryClientProvider>)
}
describe('Markdown export', () => {
  it('downloads server bytes under ROADMAP.md and explains the data limits', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(metadata).mockResolvedValueOnce(file())
    vi.stubGlobal('fetch', fetch); mount()
    await screen.findByText('Test curriculum')
    expect(screen.getByText(/Markdown is not a full database backup/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Export Roadmap as Markdown' }))
    expect(await screen.findByText(/Download requested/)).toBeInTheDocument()
    expect(fetch.mock.calls[1][0]).toBe('/api/curriculum/curriculum-a/export')
    expect(clicks).toEqual([{ href: 'blob:test-export', download: 'ROADMAP.md' }])
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(document.querySelector('a[download]')).toBeNull()
  })
  it('keeps download disabled during loading and preparation without premature success', async () => {
    let resolveMetadata!: (value: unknown) => void
    let resolveFile!: (value: unknown) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveMetadata = resolve })).mockImplementationOnce(() => new Promise(resolve => { resolveFile = resolve })))
    mount()
    expect(screen.getByRole('button', { name: 'Export Roadmap as Markdown' })).toBeDisabled()
    resolveMetadata(metadata)
    await screen.findByText('Test curriculum')
    fireEvent.click(screen.getByRole('button', { name: 'Export Roadmap as Markdown' }))
    expect(await screen.findByRole('button', { name: 'Preparing Markdown…' })).toBeDisabled()
    expect(clicks).toHaveLength(0)
    expect(screen.queryByText(/Download requested/)).not.toBeInTheDocument()
    resolveFile(file())
    expect(await screen.findByText(/Download requested/)).toBeInTheDocument()
  })
  it('presents integrity errors without a file and supports a deliberate retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(metadata).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Export stopped: mappings could not be verified.' }) }).mockResolvedValueOnce(file()))
    mount(); await screen.findByText('Test curriculum')
    fireEvent.click(screen.getByRole('button', { name: 'Export Roadmap as Markdown' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('mappings could not be verified')
    expect(clicks).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Export Roadmap as Markdown' }))
    expect(await screen.findByText(/Download requested/)).toBeInTheDocument()
    expect(clicks).toHaveLength(1)
  })
  it.each(['wrong-type', 'empty', 'network'])('rejects %s responses without downloading', async mode => {
    const fetch = vi.fn().mockResolvedValueOnce(metadata)
    if (mode === 'network') fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    else fetch.mockResolvedValueOnce({ ok: true, headers: new Headers({ 'Content-Type': mode === 'wrong-type' ? 'text/html' : 'text/markdown' }), blob: async () => new Blob([]) })
    vi.stubGlobal('fetch', fetch); mount(); await screen.findByText('Test curriculum')
    fireEvent.click(screen.getByRole('button', { name: 'Export Roadmap as Markdown' }))
    await screen.findByRole('alert')
    expect(clicks).toHaveLength(0)
    expect(screen.queryByText(/Download requested/)).not.toBeInTheDocument()
  })
  it('allows retrying failed curriculum loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(metadata))
    mount()
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Export Roadmap as Markdown' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading curriculum' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export Roadmap as Markdown' })).toBeEnabled())
  })
})
