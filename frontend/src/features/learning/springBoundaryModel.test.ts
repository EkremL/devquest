import { expect, it } from 'vitest'
import { securityBoundary, type RouteCase } from './springBoundaryModel'

const baseline:RouteCase={actor:'Verified exporter',method:'GET',csrf:false,inWorkspace:true}
it('separates identity, authority and stored record policy',()=>{
  expect(securityBoundary({...baseline,actor:'No verified identity'})).toBe('Authentication required')
  expect(securityBoundary({...baseline,actor:'Verified viewer'})).toBe('Route authority denied')
  expect(securityBoundary({...baseline,inWorkspace:false})).toBe('Workspace policy denied')
  expect(securityBoundary(baseline)).toBe('Export available')
})
it('checks the configured request protection before route and domain policy',()=>{
  expect(securityBoundary({...baseline,method:'POST',actor:'No verified identity'})).toBe('CSRF check stopped request')
  expect(securityBoundary({...baseline,method:'POST',csrf:true})).toBe('Export available')
})
