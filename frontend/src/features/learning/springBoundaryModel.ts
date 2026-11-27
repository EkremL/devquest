export const actors = ['No verified identity','Verified viewer','Verified exporter'] as const
export type Actor = typeof actors[number]
export type RouteCase = {actor:Actor; method:'GET'|'POST'; csrf:boolean; inWorkspace:boolean}
export function securityBoundary({actor,method,csrf,inWorkspace}: RouteCase) {
  if (method==='POST' && !csrf) return 'CSRF check stopped request'
  if (actor==='No verified identity') return 'Authentication required'
  if (actor==='Verified viewer') return 'Route authority denied'
  return inWorkspace ? 'Export available' : 'Workspace policy denied'
}
