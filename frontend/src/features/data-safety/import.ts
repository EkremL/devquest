export interface ImportChange { type: string; label: string; fromSection: string; toSection: string; confidence: string; explanation: string; blocking: boolean }
export interface ImportPreview { id: string; curriculumId: string; baseRevisionId: string; sourceSha256: string; expiresAt: string; identical: boolean; canApply: boolean; modules: number; sessions: number; items: number; changes: ImportChange[] }
async function json<T>(url: string, body: unknown): Promise<T> {
  let response: Response
  try { response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DevQuest-Request': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) }) }
  catch { throw new Error('The backend could not be reached or timed out. Reload current curriculum and generate a new preview before retrying.') }
  if (!response.ok) { const error = await response.json().catch(() => null) as { message?: string } | null; throw new Error(error?.message ?? 'Import request rejected. Generate a new preview and retry.') }
  return response.json() as Promise<T>
}
export async function previewImport(curriculumId: string, file: File): Promise<ImportPreview> {
  if (!/\.md$/i.test(file.name)) throw new Error('Select a Markdown (.md) file.')
  if (!file.size || file.size > 524288) throw new Error('Choose a nonempty Markdown file no larger than 512 KiB.')
  const bytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.readAsArrayBuffer(file)
  }))
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new Error('Select a valid UTF-8 Markdown file.') }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return json<ImportPreview>(`/api/curriculum/${encodeURIComponent(curriculumId)}/import-previews`, { filename: file.name, contentBase64: btoa(binary) })
}
export const applyImport = (preview: ImportPreview) => json<{ revisionId: string; unchanged: boolean }>(`/api/import-previews/${encodeURIComponent(preview.id)}/apply`, { confirmed: true, sourceSha256: preview.sourceSha256 })
