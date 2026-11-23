export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'COMPLETED'
export interface Progress { itemId: string; status: ProgressStatus; version: number; updatedAt: string; completedAt: string | null }
export interface Item { id: string; label: string; position: number; initiallyCompleted: boolean; progress: Progress }
export interface Stats { total: number; completed: number; inProgress: number; needsReview: number; notStarted: number; percentage: number; state: ProgressStatus }
export interface Statistics { sessionTopics: Stats; moduleRequirements: Stats; finalCompetencies: Stats }
export interface Section { id: string; parentId: string | null; kind: string; title: string; position: number; children: Section[]; items: Item[]; statistics: Statistics }
export interface Curriculum { curriculumId: string; revisionId: string; sourceSha256: string; root: Section }
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`/api${path}`, { ...options, signal: AbortSignal.timeout(10_000) }) }
  catch { throw new ApiError(0, 'The backend could not be reached. Check the local services, then retry.') }
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(response.status, error?.message ?? 'The request failed. Please retry.')
  }
  return response.json() as Promise<T>
}
export const getCurriculum = () => request<Curriculum>('/curriculum')
export const updateProgress = (item: Item, status: ProgressStatus) => request<Progress>(`/items/${item.id}/progress`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-DevQuest-Request': '1' },
  body: JSON.stringify({ status, version: item.progress.version }),
})
export const statusLabels: Record<ProgressStatus, string> = {
  NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', NEEDS_REVIEW: 'Needs review', COMPLETED: 'Completed',
}
