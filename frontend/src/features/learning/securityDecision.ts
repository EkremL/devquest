export interface SecurityScenario {
  evidence: 'verified' | 'claim'
  authority: 'task:read' | 'task:create'
  workspace: 'North' | 'South'
}

export const baseline: Readonly<SecurityScenario> = { evidence: 'verified', authority: 'task:read', workspace: 'North' }

export const responseNames = { 200: 'OK', 401: 'Unauthorized', 403: 'Forbidden' } as const
export type ResponseStatus = keyof typeof responseNames

const outcomes = {
  evidence: {
    status: 401, stop: 1, title: 'Authentication stopped the request',
    reason: 'The request claims Maya’s identity without verified evidence. The API has no authenticated principal for this request, so it checks neither the grant nor the task’s workspace.',
    next: 'Switch only the evidence to a verified session. Watch whether the request reaches the action check.',
  },
  authority: {
    status: 403, stop: 2, title: 'The read action was denied',
    reason: 'The verified session establishes Maya as the caller. Her trusted grant is task:create, which does not authorize reading. The workspace rule is never evaluated.',
    next: 'Switch only the grant to task:read. Watch whether the workspace check now runs.',
  },
  scope: {
    status: 403, stop: 3, title: 'The task is outside Maya’s scope',
    reason: 'The API verified Maya and found task:read. Task 17’s stored workspace is South, outside Maya’s authorized North scope.',
    next: 'Switch only the stored task workspace to North. Keep verification and the read grant fixed.',
  },
  allowed: {
    status: 200, stop: null, title: 'The API can return the task',
    reason: 'The API verified Maya, found task:read, and matched Task 17’s stored North workspace to her authorized North scope. All three checks passed.',
    next: 'Switch only Task 17’s stored workspace to South. Authentication and the grant stay the same, so any difference comes from scope.',
  },
} as const

export function evaluateSecurityDecision(scenario: Readonly<SecurityScenario>) {
  if (scenario.evidence === 'claim') return outcomes.evidence
  if (scenario.authority !== 'task:read') return outcomes.authority
  if (scenario.workspace !== 'North') return outcomes.scope
  return outcomes.allowed
}
