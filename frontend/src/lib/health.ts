export type Health = {
  application: 'DevQuest'
  status: 'UP' | 'DOWN'
  database: 'UP' | 'DOWN'
  migrations: 'UP' | 'DOWN' | 'UNKNOWN'
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch('/api/health', {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok && response.status !== 503) throw new Error('Backend unavailable')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('application' in data) || data.application !== 'DevQuest'
    || !('status' in data) || !['UP', 'DOWN'].includes(String(data.status))
    || !('database' in data) || !['UP', 'DOWN'].includes(String(data.database))
    || !('migrations' in data) || !['UP', 'DOWN', 'UNKNOWN'].includes(String(data.migrations))) {
    throw new Error('Unexpected health response')
  }
  return data as Health
}
