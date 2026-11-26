export const missionIds = [
  'verify-evidence', 'inspect-context', 'decide-access', 'trace-boundary', 'attribute-request', 'review-request',
  'build-export-grants', 'repair-default-policy', 'simulate-policy-failure', 'trace-export-enforcement', 'review-export-release',
  'build-http-request', 'inspect-basic-encoding', 'trace-http-transport', 'inspect-http-carriers', 'diagnose-http-response', 'investigate-http-incident',
] as const

export type MissionId = typeof missionIds[number]
export type MissionState = 'Not explored' | 'In progress' | 'Activity completed'
export type ReportActivity = (completed?: boolean) => void

export function isMissionId(value: string | null): value is MissionId {
  return missionIds.some(id => id === value)
}
