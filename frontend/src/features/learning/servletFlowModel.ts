export const routes=['/exports/today','/profile'] as const
export const chainOrders=['Exports first','Fallback first'] as const
export type Route = typeof routes[number]
export type ChainOrder = typeof chainOrders[number]

export function selectedChain(path:Route, order:ChainOrder) {
  return order==='Exports first' && path==='/exports/today' ? 'Export chain' : 'Fallback chain'
}

export function invocationTrace(continueChain:boolean) {
  return continueChain ? ['Filter before','MVC handler','Filter after'] : ['Filter before','Filter writes response']
}

export const placements=['Before metadata','After metadata'] as const
export function observerOutput(placement:typeof placements[number]) {
  return placement===placements[1] ? 'Observer has route metadata' : 'Observer has no route metadata'
}

export function traceObserver(path:Route, order:ChainOrder, placement:typeof placements[number], diagnostics:boolean) {
  const selected=selectedChain(path,order)
  const detail=selected==='Fallback chain'?'Export observer absent from this chain':observerOutput(placement)
  return {selected,detail,visible:diagnostics}
}
