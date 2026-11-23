export async function downloadRoadmap(curriculumId: string): Promise<void> {
  const response = await fetch(`/api/curriculum/${encodeURIComponent(curriculumId)}/export`, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(error?.message ?? 'The export could not be prepared. Please retry.')
  }
  if (!response.headers.get('Content-Type')?.toLowerCase().startsWith('text/markdown')) {
    throw new Error('The server returned an unexpected file type. No download was started.')
  }
  const blob = await response.blob()
  if (!blob.size) throw new Error('The server returned an empty file. No download was started.')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ROADMAP.md'
  document.body.appendChild(link)
  try { link.click() }
  finally {
    link.remove()
    // Let the browser consume the URL before releasing it, including slower download handlers.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
