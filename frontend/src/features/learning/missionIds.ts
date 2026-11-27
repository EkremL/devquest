export const missionIds = [
  'verify-evidence', 'inspect-context', 'decide-access', 'trace-boundary', 'attribute-request', 'review-request',
  'build-export-grants', 'repair-default-policy', 'simulate-policy-failure', 'trace-export-enforcement', 'review-export-release',
  'build-http-request', 'inspect-basic-encoding', 'trace-http-transport', 'inspect-http-carriers', 'diagnose-http-response', 'investigate-http-incident',
  'follow-session-signin', 'inspect-session-cookie', 'advance-session-clock', 'trace-shared-session', 'rotate-session-id',
  'verify-session-logout', 'investigate-session-incident',
  'triage-security-request', 'trace-security-filters', 'route-security-handler', 'repair-security-response',
  'match-security-rule', 'debug-lab-challenge', 'investigate-security-incident',
  'dispatch-token-pair', 'validate-token-window', 'compare-token-revocation', 'rotate-refresh-family', 'resolve-token-contract',
  'inspect-jwt-envelope', 'evaluate-jwt-claims', 'compare-jwt-keys', 'verify-jwt-policy', 'review-jwt-architecture',
] as const

export type MissionId = typeof missionIds[number]
export type MissionState = 'Not explored' | 'In progress' | 'Activity completed'
export type ReportActivity = (completed?: boolean) => void

export function isMissionId(value: string | null): value is MissionId {
  return missionIds.some(id => id === value)
}
