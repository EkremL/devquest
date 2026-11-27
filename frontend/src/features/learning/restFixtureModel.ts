export const restRoutes=['/api/status','/api/profile','/api/unlisted'] as const
export type RestRoute=typeof restRoutes[number]

export function restResponse(route:RestRoute, verified:boolean) {
  if (route==='/api/status') return {status:200,body:'{ "status": "available" }',controller:'Status controller',challenge:false}
  if (!verified) return {status:401,body:'',controller:'Not invoked',challenge:true}
  if (route==='/api/profile') return {status:200,body:'{ "name": "fixture-reader" }',controller:'Profile controller',challenge:false}
  return {status:403,body:'',controller:'Not invoked',challenge:false}
}
export const profileTrace={
  anonymous:['Selected API chain','Basic filter sees no header','Verified identity is required','Basic challenge returned'],
  accepted:['Selected API chain','Manager verifies fixture evidence','Verified context satisfies route policy','Profile controller reads the principal'],
} as const
export function restContract(observed: readonly string[]) {
  if(!observed.includes('public'))return 'Verify the public route without credentials'
  if(!observed.includes('challenge'))return 'Verify the protected route challenges'
  if(!observed.includes('principal'))return 'Inspect the accepted principal'
  if(!observed.includes('fallback'))return 'Verify an unlisted route stays denied'
  return 'REST release contract verified'
}
