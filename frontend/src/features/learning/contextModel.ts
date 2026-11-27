export const trustStates=['Empty context','Submitted token','Anonymous token','Verified token'] as const
export type TrustState=typeof trustStates[number]
export const trustRecords: Record<TrustState, { flag:string; principal:string; accepted:boolean }> = {
  'Empty context':{flag:'No object',principal:'Absent',accepted:false},
  'Submitted token':{flag:'false',principal:'Claimed identity',accepted:false},
  'Anonymous token':{flag:'true',principal:'Anonymous placeholder',accepted:false},
  'Verified token':{flag:'true',principal:'Verified identity',accepted:true},
}
export function taskTrace(propagated:boolean, throws:boolean) {
  return {
    during:propagated?'Verified task identity':'Empty worker context',
    terminal:throws?'Task raised its fixture exception':'Task returned normally',
    after:'Empty worker baseline',
  }
}
export function cleanupContract(trustAware:boolean, scoped:boolean, exceptionTest:boolean) {
  if (!trustAware) return 'Require an anonymous-aware trust decision'
  if (!scoped) return 'Scope propagation to the selected task'
  if (!exceptionTest) return 'Verify cleanup when a task throws'
  return 'Context contract verified'
}
