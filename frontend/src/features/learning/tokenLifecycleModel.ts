export type Format = 'opaque' | 'self-contained'
export type Credential = 'access' | 'refresh' | 'none'
export type Endpoint = 'resource' | 'issuer'
export const expiry = 5

export function delivery(credential: Credential, endpoint: Endpoint) {
  if (credential === 'none') return 'No credential presented'
  if (credential === 'access' && endpoint === 'resource') return 'Access evidence reaches the resource verifier'
  if (credential === 'refresh' && endpoint === 'issuer') return 'Refresh evidence reaches the issuer'
  return credential === 'refresh' ? 'Resource rejects refresh evidence' : 'Refresh endpoint rejects access evidence'
}

export function validateAccess(format: Format, minute: number, revoked: boolean, issuerUp: boolean) {
  if (format === 'opaque' && !issuerUp) return 'Introspection unavailable'
  if (minute >= expiry) return 'Expired'
  if (format === 'opaque' && revoked) return 'Inactive at issuer'
  return 'Accepted for this resource'
}

export type Grant = { generation: number; revoked: boolean }
export function refreshGrant(grant: Grant, presented: number) {
  if (grant.revoked) return { grant, result:'Grant closed' }
  if (presented < grant.generation) return { grant:{ ...grant, revoked:true }, result:'Retired refresh handle detected · grant closed' }
  if (presented > grant.generation) return { grant, result:'Unknown handle' }
  return { grant:{ ...grant, generation:grant.generation + 1 }, result:'Issued replacement · prior handle retired' }
}
