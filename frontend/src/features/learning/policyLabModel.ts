export const grantRows = [
  { id: 'status', label: 'Read export status', target: 'North', required: true },
  { id: 'download', label: 'Download export', target: 'North', required: true },
  { id: 'create', label: 'Create an export', target: 'North', required: false },
  { id: 'share', label: 'Publish public link', target: 'North', required: false },
  { id: 'cross', label: 'Download export', target: 'Any workspace', required: false },
] as const

export type Grant = typeof grantRows[number]['id']

export function evaluateGrants(grants: readonly Grant[]) {
  const missing = grantRows.filter(row => row.required && !grants.includes(row.id))
  const exposure = grantRows.filter(row => !row.required && grants.includes(row.id))
  return { missing, exposure, minimum: missing.length === 0 && exposure.length === 0 }
}

export const policyRequests = [
  { id: 'same', label: 'North download', verified: true, action: 'export:download', target: 'North' },
  { id: 'cross', label: 'South download', verified: true, action: 'export:download', target: 'South' },
  { id: 'unmatched', label: 'Publish link', verified: true, action: 'export:share', target: 'North' },
  { id: 'anonymous', label: 'Unverified download', verified: false, action: 'export:download', target: 'North' },
] as const

export function evaluatePolicy(id: typeof policyRequests[number]['id'], allowUnmatched: boolean) {
  const request = policyRequests.find(candidate => candidate.id === id)!
  if (!request.verified) return { stop: 'identity', allowed: false, reason: 'A verified caller is required before consulting a grant.' } as const
  if (request.target !== 'North') return { stop: 'scope', allowed: false, reason: 'The stored export belongs to South. The trusted account scope is North.' } as const
  if (request.action === 'export:download') return { stop: 'rule', allowed: true, reason: 'The explicit download rule matches the action and stored scope.' } as const
  return { stop: 'fallback', allowed: allowUnmatched, reason: allowUnmatched
    ? 'No rule permits publishing. The unsafe fallback silently opens the operation.'
    : 'No allow rule matches publishing. The default refusal stays in effect.' } as const
}

export const dependencies = [
  { id: 'permit', label: 'Membership confirmed' },
  { id: 'missing', label: 'Membership missing' },
  { id: 'offline', label: 'Lookup timed out' },
  { id: 'denied', label: 'Explicit policy refusal' },
] as const

export function evaluateFailure(state: typeof dependencies[number]['id'], permissive: boolean) {
  if (state === 'permit') return { status: 200, opens: true, meaning: 'The required membership and action grant are available.' }
  if (state === 'denied') return { status: 403, opens: false, meaning: 'The policy made an explicit refusal.' }
  if (state === 'missing') return { status: permissive ? 200 : 403, opens: permissive, meaning: permissive
    ? 'The fallback treats absent membership as permission.' : 'The service requires a current membership record. The request has none.' }
  return { status: permissive ? 200 : 503, opens: permissive, meaning: permissive
    ? 'The fallback releases the file even though membership could not be checked.'
    : 'Membership is unknown during the outage. This API returns a service error and keeps storage closed.' }
}

export type Enforcement = 'ui' | 'service' | 'layered'

export function traceEnforcement(target: 'North' | 'South' | 'Storage isolation test', gate: Enforcement) {
  if (target === 'North') return { service: 'Allowed', storage: 'Opened', exposed: false }
  if (target === 'Storage isolation test') return gate === 'layered'
    ? { service: 'Test starts at storage', storage: 'Scope filter blocked', exposed: false }
    : { service: 'Test starts at storage', storage: 'Wrong workspace opened', exposed: true }
  if (gate === 'ui') return { service: 'Skipped', storage: 'Wrong workspace opened', exposed: true }
  return { service: 'Blocked', storage: 'Not reached', exposed: false }
}

export const releaseChecks = [
  { name: 'grant', label: 'Worker grant', options: ['Read all workspaces', 'Download North only'] },
  { name: 'scope', label: 'Workspace facts', options: ['Use request workspace', 'Use stored tenant + trusted membership'] },
  { name: 'default', label: 'Unmatched action', options: ['Allow unlisted action', 'Deny unmatched action'] },
  { name: 'failure', label: 'Membership timeout', options: ['Open cached export', 'Return 503 before storage'] },
  { name: 'gate', label: 'Enforcement point', options: ['Hide the download button', 'Enforce before storage'] },
] as const

export function reviewRelease(values: readonly (string | null)[]) {
  return releaseChecks.map((check, index) => ({
    name: check.name, label: check.label, passes: values[index] === check.options[1],
  }))
}
