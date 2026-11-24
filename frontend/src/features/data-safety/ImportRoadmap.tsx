import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, ShieldCheck, TriangleAlert } from 'lucide-react'
import { applyImport, previewImport, type ImportPreview } from './import'

const labels: Record<string, string> = { ADDED: 'Added items', REMOVED: 'Removed items · retained in history', REORDERED: 'Reordered items', MOVED: 'Moved items', MARKER_CHANGED: 'Changed completion markers', PROGRESS_CONFLICT: 'Progress conflicts · keep PostgreSQL', AMBIGUOUS: 'Ambiguous identities · blocked', RENAMED_OR_MODIFIED: 'Possible renames or modifications · blocked', SECTIONS_CHANGED: 'Section structure and order' }
export function ImportRoadmap({ curriculumId }: { curriculumId: string }) {
  const client = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function prepare() {
    if (!file) return
    setBusy('preview'); setPreview(null); setConfirmed(false); setError(''); setNotice('')
    try { setPreview(await previewImport(curriculumId, file)) }
    catch (error) { setError(error instanceof Error ? error.message : 'Preview failed.') }
    finally { setBusy(null) }
  }
  async function apply() {
    if (!preview?.canApply || !confirmed) return
    setBusy('apply'); setError(''); setNotice('')
    try {
      const result = await applyImport(preview)
      setPreview(null); setConfirmed(false)
      await client.invalidateQueries({ queryKey: ['curriculum'] })
      setNotice(result.unchanged ? 'Identical source confirmed. No curriculum or progress changed.' : `Import confirmed. Revision ${result.revisionId} is now active. Existing progress and history were preserved.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed.')
      setPreview(null); setConfirmed(false)
      await client.invalidateQueries({ queryKey: ['curriculum'] })
    } finally { setBusy(null) }
  }
  return <section className="import-panel" aria-labelledby="import-heading">
    <div className="export-icon"><Upload size={25} /></div><h2 id="import-heading">Import Updated Roadmap</h2>
    <p>Preview an updated UTF-8 Markdown file before making any changes. Existing PostgreSQL progress always takes priority over uploaded checkboxes.</p>
    <label className="file-label" htmlFor="roadmap-file">Choose roadmap (.md, up to 512 KiB)</label>
    <input id="roadmap-file" type="file" accept=".md,text/markdown" disabled={!!busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setConfirmed(false); setError(''); setNotice('') }} />
    <button className="secondary-button" disabled={!file || !!busy} onClick={() => void prepare()}>{busy === 'preview' ? 'Generating preview…' : 'Preview changes'}</button>
    {busy && <p role="status">{busy === 'preview' ? 'Comparing source structure and stable identities. No database changes are being made.' : 'Applying the confirmed revision in one transaction…'}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {notice && <p className="export-feedback" role="status">{notice}</p>}
    {preview && <div className="import-preview">
      <h3>{preview.identical ? 'Identical source · no changes' : preview.canApply ? 'Ready for your review' : 'Manual reconciliation required'}</h3>
      <p className={preview.canApply ? 'preview-safe' : 'preview-blocked'}>{preview.canApply ? <ShieldCheck size={17} /> : <TriangleAlert size={17} />}{preview.canApply ? 'Supported changes. Review every section before confirming.' : 'This preview cannot be applied. Resolve the ambiguous changes in your file and preview again.'}</p>
      <p><strong>{preview.modules}</strong> modules · <strong>{preview.sessions}</strong> sessions · <strong>{preview.items}</strong> checklist items in the proposed revision</p>
      <dl className="preview-metadata"><dt>Current revision</dt><dd>{preview.baseRevisionId}</dd><dt>Uploaded SHA-256</dt><dd>{preview.sourceSha256}</dd><dt>Preview expires</dt><dd>{new Date(preview.expiresAt).toLocaleString()}</dd></dl>
      {!preview.identical && <p>Clearly matched items keep their IDs and progress. New items use their source checkbox state without invented history. Removed items are retired, never deleted. Unlisted source formatting and prose are retained in the new revision.</p>}
      {Object.entries(labels).map(([type, title]) => {
        const changes = preview.changes.filter(change => change.type === type)
        if (!changes.length) return null
        return <details key={type} open={changes.some(change => change.blocking)} className={changes.some(change => change.blocking) ? 'blocking-changes' : ''}><summary>{title} ({changes.length})</summary><ul>{changes.map((change, index) => <li key={`${type}-${index}`}><strong>{change.label}</strong>{change.fromSection && <p>From: {change.fromSection}</p>}{change.toSection && <p>To: {change.toSection}</p>}<p>{change.explanation}</p><span className="match-confidence">Match: {change.confidence.replaceAll('_', ' ').toLowerCase()}</span></li>)}</ul></details>
      })}
      {preview.canApply && <div className="import-confirmation"><label><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={event => setConfirmed(event.target.checked)} />I reviewed this preview and confirm these changes, including any retirements. Existing PostgreSQL progress must be preserved.</label><button className="primary-button export-button" disabled={!confirmed || !!busy} onClick={() => void apply()}>{busy === 'apply' ? 'Applying…' : preview.identical ? 'Confirm no changes' : 'Confirm and apply import'}</button></div>}
    </div>}
    <p className="import-footnote">Previews expire after 10 minutes or a backend restart. A changed revision or progress requires a fresh preview. The original curriculum file is never overwritten.</p>
  </section>
}
