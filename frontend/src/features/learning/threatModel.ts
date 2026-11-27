export const incidentSignals = [
  {name:'Focused failures', tape:['18:00 · one account · rising failure count','18:03 · no successful sign-ins'], finding:'Focused guessing suspected', action:'Review account-aware throttling. The failure concentration does not identify a stolen credential.'},
  {name:'Distributed anomalies', tape:['18:11 · failures across many accounts','18:14 · a small number of unfamiliar successes'], finding:'Credential reuse suspected', action:'Correlate redacted evidence and investigate unfamiliar successes. The aggregate pattern does not prove password reuse.'},
  {name:'Confirmed exposure', tape:['18:22 · incident owner confirms credential material was exposed','18:25 · affected integration identified'], finding:'Exposure confirmed', action:'Withdraw affected evidence, restrict access to the exposed artifact and review derived access.'},
] as const

export const transition = [
  {name:'Before verification', reference:'Anonymous A', prior:'Anonymous A has no principal', current:'No authenticated principal'},
  {name:'After verified sign-in', reference:'Authenticated B', prior:'Anonymous A no longer resolves', current:'Authenticated B resolves to a verified principal'},
  {name:'After logout', reference:'Invalidated B', prior:'Anonymous A remains invalid', current:'Authenticated B no longer resolves'},
] as const

export function containment(minute: number, cancelled: boolean, currentLookup: boolean, reachable: boolean) {
  if (minute >= 5) return 'Expired evidence'
  if (!currentLookup) return 'Eligible on time alone'
  if (!reachable) return 'Protected response withheld'
  return cancelled ? 'Withdrawal observed' : 'Current evidence verified'
}

export function completion(factor: 'Pending'|'Rejected'|'Verified', currentSession: boolean) {
  if (factor !== 'Verified') return 'No authenticated principal'
  return currentSession ? 'Verified principal established' : 'No current session'
}
