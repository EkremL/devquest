import type { Viewport } from '@xyflow/react'

type Size = { width: number; height: number }
type Frame = Viewport & Size
const history = new Map<string, Frame>()

// Store only recent in-app entries. An explicit sidebar visit starts with the overview.
export function rememberFrame(key: string, viewport: Viewport, width: number, height: number) {
  if (!width || !height || ![viewport.x, viewport.y, viewport.zoom].every(Number.isFinite)) return
  history.delete(key)
  history.set(key, {...viewport,width,height})
  if(history.size>12) history.delete(history.keys().next().value!)
}

export function recallFrame(key: string) {
  return history.get(key)
}

export function recenter(viewport: Viewport, before: Size, after: Size): Viewport {
  return {
    x: viewport.x+(after.width-before.width)/2,
    y: viewport.y+(after.height-before.height)/2,
    zoom: viewport.zoom,
  }
}
