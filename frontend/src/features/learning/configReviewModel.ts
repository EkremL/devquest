export const inventoryPaths=['GET /api/status','POST /api/status','GET /api/status/detail','GET /other'] as const
export type InventoryPath=typeof inventoryPaths[number]
export function reviewedRule(path:InventoryPath, exactFirst:boolean) {
  if(exactFirst&&path===inventoryPaths[0])return 'Public GET rule selected'
  if(path.startsWith('GET /api/')||path.startsWith('POST /api/'))return 'API guard selected'
  return 'Deny-all fallback selected'
}
export function restoredIdentity(sessionBacked:boolean, saved:boolean) {
  return sessionBacked&&saved?'Saved context restored':'New evidence required'
}
export function browserGate(preflight:boolean, allowedOrigin:boolean, csrf:boolean) {
  if(!allowedOrigin)return 'Origin refused by CORS'
  if(preflight)return 'Preflight accepted'
  return csrf?'Protected POST proceeds':'Actual POST blocked by CSRF'
}
export function configContract(current:boolean, scopedTrace:boolean, boundaryTests:boolean) {
  if(!current)return 'Use the current lambda configuration'
  if(!scopedTrace)return 'Use scoped redacted filter diagnostics'
  if(!boundaryTests)return 'Include the public and fallback probes'
  return 'Security policy revision verified'
}
