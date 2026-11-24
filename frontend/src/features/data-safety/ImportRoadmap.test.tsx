import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImportRoadmap } from './ImportRoadmap'
import type { ImportPreview } from './import'

const safe: ImportPreview = { id: 'preview-a', curriculumId: 'curriculum-a', baseRevisionId: 'revision-a', sourceSha256: 'a'.repeat(64), expiresAt: '2026-11-23T23:59:00Z', identical: false, canApply: true, modules: 11, sessions: 76, items: 890,
  changes: [{ type: 'ADDED', label: 'New topic', fromSection: '', toSection: 'Module 0 / Session 0.1', confidence: 'NEW_OCCURRENCE', explanation: 'Create an independent identity.', blocking: false }] }
const ok = (data: unknown) => ({ ok: true, json: async () => structuredClone(data) })
function mount() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ImportRoadmap curriculumId="curriculum-a" /></QueryClientProvider>) }
function select(name = 'ROADMAP.md', content = '# Test source\r\n') { fireEvent.change(screen.getByLabelText('Choose roadmap (.md, up to 512 KiB)'), { target: { files: [new File([content], name, { type: 'text/markdown' })] } }) }
async function prepare() { select(); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' })); await screen.findByText('Ready for your review') }
afterEach(() => vi.unstubAllGlobals())

describe('safe import workflow', () => {
  it('uploads exact bytes for preview and requires explicit confirmation before apply', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(ok(safe)).mockResolvedValueOnce(ok({ revisionId: 'revision-b', unchanged: false }))
    vi.stubGlobal('fetch', fetch); mount(); await prepare()
    expect(fetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetch.mock.calls[0][1].body as string)
    expect(atob(body.contentBase64)).toBe('# Test source\r\n')
    expect(screen.getByText('Added items (1)')).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: 'Confirm and apply import' })
    expect(apply).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(apply)
    expect(await screen.findByText(/Import confirmed. Revision revision-b/)).toBeInTheDocument()
    expect(JSON.parse(fetch.mock.calls[1][1].body as string)).toEqual({ confirmed: true, sourceSha256: safe.sourceSha256 })
    expect(fetch.mock.calls[1][0]).toBe('/api/import-previews/preview-a/apply')
  })
  it('blocks ambiguous matches and presents their explanation as text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...safe, canApply: false, changes: [{ type: 'AMBIGUOUS', label: '<script>unsafe()</script>', fromSection: 'Old', toSection: 'New', confidence: 'UNRESOLVED', explanation: 'Duplicate identities need manual review.', blocking: true }] })))
    mount(); select(); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    await screen.findByText('Manual reconciliation required')
    expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('Duplicate identities need manual review.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm and apply import' })).not.toBeInTheDocument()
  })
  it('shows the database-preserving resolution for checkbox conflicts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...safe, changes: [{ type: 'PROGRESS_CONFLICT', label: 'Existing topic', fromSection: 'Session', toSection: 'Session', confidence: 'PRESERVE_DATABASE', explanation: 'Keep PostgreSQL status NEEDS_REVIEW; ignore the uploaded checkbox.', blocking: false }] })))
    mount(); await prepare()
    fireEvent.click(screen.getByText('Progress conflicts · keep PostgreSQL (1)'))
    expect(screen.getByText(/Keep PostgreSQL status NEEDS_REVIEW/)).toBeInTheDocument()
  })
  it('clears an old preview and confirmation when a different file is selected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(safe)))
    mount(); await prepare(); fireEvent.click(screen.getByRole('checkbox')); select('changed.md')
    expect(screen.queryByText('Ready for your review')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
  it('shows a preview loading state and never applies automatically', async () => {
    let resolve!: (value: unknown) => void
    const fetch = vi.fn(() => new Promise(r => { resolve = r }))
    vi.stubGlobal('fetch', fetch); mount(); select(); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    expect(await screen.findByRole('button', { name: 'Generating preview…' })).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); resolve(ok(safe))
    await screen.findByText('Ready for your review')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('rejects a stale apply and requires a new preview', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(safe)).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Progress changed. Generate a new preview.' }) }))
    mount(); await prepare(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm and apply import' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Generate a new preview')
    expect(screen.queryByText(/Import confirmed/)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
  it('reports rejected previews without offering apply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Invalid roadmap heading.' }) }))
    mount(); select(); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid roadmap heading')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
  it('confirms identical imports as no-ops', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ ...safe, identical: true, changes: [] })).mockResolvedValueOnce(ok({ revisionId: 'revision-a', unchanged: true })))
    mount(); select(); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    await screen.findByText('Identical source · no changes'); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Confirm no changes' }))
    expect(await screen.findByText('Identical source confirmed. No curriculum or progress changed.')).toBeInTheDocument()
  })
  it('rejects invalid filenames before sending data', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); mount(); select('roadmap.html'); fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Markdown (.md)')
    expect(fetch).not.toHaveBeenCalled()
  })
})
