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
  'route-mechanism', 'probe-withdrawal', 'trace-mechanism-state', 'audit-mechanism-storage', 'review-mechanism-choice',
  'triage-auth-signals', 'verify-session-boundary', 'review-auth-observability', 'probe-auth-containment', 'confirm-auth-incident',
  'cross-spring-boundary', 'inspect-spring-evidence', 'compare-spring-protections', 'audit-spring-policy', 'review-spring-boundary',
  'follow-servlet-call', 'inspect-servlet-delegates', 'route-servlet-chain', 'order-servlet-observer', 'confirm-servlet-evidence',
  'open-auth-context', 'compare-context-trust', 'walk-context-lifecycle', 'compare-context-threads', 'review-context-cleanup',
  'route-auth-provider', 'inspect-provider-account', 'compare-provider-proof', 'trace-provider-result', 'review-provider-wiring',
] as const

export type MissionId = typeof missionIds[number]
export type MissionState = 'Not explored' | 'In progress' | 'Activity completed'
export type ReportActivity = (completed?: boolean) => void

export function isMissionId(value: string | null): value is MissionId {
  return missionIds.some(id => id === value)
}
