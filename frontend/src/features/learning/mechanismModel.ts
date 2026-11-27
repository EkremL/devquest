export const mechanisms = ['Server session', 'Opaque token', 'JWT access token', 'API key', 'Mutual TLS'] as const
export type Mechanism = typeof mechanisms[number]
export const paths: Record<Mechanism, {evidence:string; verifier:string; dependency:string; visits:number}> = {
  'Server session': {evidence:'HttpOnly cookie reference',verifier:'Session lookup',dependency:'Shared session store',visits:1},
  'Opaque token': {evidence:'Bearer handle',verifier:'Online introspection',dependency:'Authorization server',visits:1},
  'JWT access token': {evidence:'Signed bearer evidence',verifier:'Signature and claims',dependency:'Trusted cached keys',visits:0},
  'API key': {evidence:'Integration secret',verifier:'Scoped key lookup',dependency:'Integration credential registry',visits:1},
  'Mutual TLS': {evidence:'Certificate and possession proof',verifier:'TLS endpoint and identity mapping',dependency:'Configured local trust and identity map',visits:0},
}

export function withdrawal(mechanism: Mechanism, withdrawn: boolean, reachable: boolean, minute: number) {
  if (minute >= 5) return 'Lifetime ended'
  if (mechanism === 'JWT access token') return 'Locally eligible'
  if (!reachable) return 'Required authority unavailable'
  return withdrawn ? 'Withdrawn at current lookup' : 'Eligible after current lookup'
}

export const storage = [
  {item:'Session reference',expected:'Scoped HttpOnly cookie',choices:['Scoped HttpOnly cookie','URL query string'],note:'Keep the reference out of URLs and add CSRF protection where required.'},
  {item:'Partner API key',expected:'Workload secret store',choices:['Public browser bundle','Workload secret store'],note:'A publicly distributed bundle cannot hold a confidential integration credential.'},
  {item:'TLS private key',expected:'Managed key provider',choices:['Shared request logs','Managed key provider'],note:'Keep proof-of-possession material at the controlled workload or key provider.'},
] as const
