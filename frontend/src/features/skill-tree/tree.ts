import type { Edge, Node, XYPosition } from '@xyflow/react'
import type { Section } from '../curriculum/api'

export type ModuleNode = Node<{
  section: Section; active: boolean; open: boolean; choose: (id: string) => void; toggle: (id: string) => void
}, 'module'>
export type SessionNode = Node<{ section: Section }, 'session'>
export type MapEdge = Edge<{ path: string }, 'trail'>
export type MapNode = ModuleNode | SessionNode | Node<Record<string, never>, 'compass'>

export const sessionsOf = (section: Section) => section.children
  .filter(child => child.kind === 'SESSION').sort((a, b) => a.position - b.position)

const moduleSize = { width: 168, height: 132 }
const sessionSize = { width: 138, height: 78 }
const origin: [number, number] = [0.5, 0.5]
const polar = (angle: number, x: number, y = x) => ({ x: Math.cos(angle) * x, y: Math.sin(angle) * y })
const add = (a: XYPosition, b: XYPosition) => ({ x: a.x + b.x, y: a.y + b.y })

function boundary(center: XYPosition, toward: XYPosition, size: typeof moduleSize) {
  const x = toward.x - center.x
  const y = toward.y - center.y
  // Tuck each end behind the node so rounded corners don't leave dangling trails.
  const scale = 0.78 / Math.max(Math.abs(x) / (size.width / 2), Math.abs(y) / (size.height / 2))
  return { x: center.x + x * scale, y: center.y + y * scale }
}

function curve(from: XYPosition, control: XYPosition, to: XYPosition) {
  return `M ${from.x},${from.y} Q ${control.x},${control.y} ${to.x},${to.y}`
}

export function buildTree(
  modules: Section[], selected: string, expanded: string | null,
  choose: (id: string) => void, toggle: (id: string) => void,
) {
  const ordered = modules.filter(section => section.kind === 'MODULE').sort((a, b) => a.position - b.position)
  // The gap between the last and first node keeps the trail visibly open.
  const arc = Math.PI * 1.8
  const step = arc / Math.max(1, ordered.length - 1)
  const spread = Math.max(1, ordered.length / 11)
  const nodes: MapNode[] = [{ id: 'skill-compass', type: 'compass', data: {}, position: { x: 0, y: 0 }, origin, focusable: false }]
  const edges: MapEdge[] = []
  const branchIds: string[] = []

  function connect(source: string, target: string, path: string, kind: 'sequence' | 'branch', lit: boolean) {
    edges.push({ id: `${source}:${target}`, source, target, type: 'trail',
      selectable: false, className: `skill-trail ${kind}${lit ? ' lit' : ''}`, data: { path } })
  }

  ordered.forEach((section, index) => {
    const angle = -Math.PI / 2 + index * step
    const position = polar(angle, 426 * spread, 350 * spread)
    const open = section.id === expanded
    nodes.push({ id: section.id, type: 'module', position, origin, ...moduleSize,
      data: { section, active: selected === section.id, open, choose, toggle } })

    if (index > 0) {
      const previous = ordered[index - 1]
      const start = polar(angle - step, 426 * spread, 350 * spread)
      const control = polar(angle - step / 2, 474 * spread, 396 * spread)
      connect(previous.id, section.id, curve(boundary(start, control, moduleSize), control, boundary(position, control, moduleSize)),
        'sequence', previous.statistics.sessionTopics.state === 'COMPLETED' && section.statistics.sessionTopics.state === 'COMPLETED')
    }
    if (!open) return

    const sessions = sessionsOf(section)
    branchIds.push(section.id)
    // Fan outward, away from the other modules. Increase the radius for large branches
    // so adjacent rectangular nodes have a clear gap even on diagonal rays.
    const radius = Math.max(250, sessions.length * 89)
    const span = Math.min(2.15, Math.max(0, sessions.length - 1) * 0.59)
    const direction = Math.atan2(position.y, position.x)
    const fork = add(position, polar(direction, 117))
    const start = boundary(position, fork, moduleSize)

    sessions.forEach((session, i) => {
      const ray = direction + (sessions.length === 1 ? 0 : span * (i / (sessions.length - 1) - 0.5))
      const point = add(position, polar(ray, radius))
      // Each fork follows its own ray, preserving the reading order across the fan.
      const control = add(fork, polar(ray, radius * 0.18))
      nodes.push({ id: session.id, type: 'session', origin, position: point, ...sessionSize, data: { section: session } })
      branchIds.push(session.id)
      connect(section.id, session.id, curve(start, control, boundary(point, control, sessionSize)),
        'branch', session.statistics.sessionTopics.state === 'COMPLETED')
    })
  })
  return { nodes, edges, branchIds }
}

