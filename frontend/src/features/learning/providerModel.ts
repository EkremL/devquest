export const tokenKinds=['Username/password','Bearer token','Unsupported token'] as const
export type TokenKind=typeof tokenKinds[number]
export const providers=['DAO provider','JWT provider'] as const

export function providerRoute(kind:TokenKind) {
  if(kind===tokenKinds[0]) return providers[0]
  if(kind===tokenKinds[1]) return providers[1]
  return 'ProviderNotFoundException'
}
export const accountStates=['Active','Locked','Disabled'] as const
export type AccountState = typeof accountStates[number]
export function daoResult(account:AccountState, matches:boolean) {
  if(account==='Locked')return 'LockedException'
  if(account==='Disabled')return 'DisabledException'
  return matches?'Authenticated result returned':'BadCredentialsException'
}
export function providerContract(route:boolean, status:boolean, erasure:boolean) {
  if(!route)return 'Restore token-type routing'
  if(!status)return 'Preserve the account-status gate'
  if(!erasure)return 'Keep credentials out of the result'
  return 'Provider contract verified'
}
