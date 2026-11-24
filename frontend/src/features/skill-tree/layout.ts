import type { Edge, Node, XYPosition } from '@xyflow/react'
import type { Section } from '../../features/curriculum/api'

export const accents = ['#69e6ce','#77baff','#af9ef6','#68d5ea','#c49afa','#73b5ff','#76ded0','#ae99ff','#61d1e9','#95a5f9','#a5e6cb']
export const ordered = (sections: Section[], kind: string) => sections.filter(s => s.kind === kind).sort((a,b) => a.position-b.position)
export const titleOf = (s: Section) => s.title.split(' — ').slice(1).join(' — ') || s.title
export const codeOf = (s: Section) => s.title.split(' — ')[0]
export type AtlasNode = Node<{section: Section; hub: boolean; index: number; owner: string; ordinal: number}, 'skill'>
export type Trail = Edge<{path: string; owner: string; color: string; completed: boolean; route: boolean}, 'trail'>

// Hand-placed waypoints give the course a readable route at atlas scale.
// Each session arm is constructed below from the actual children, in source order.
const terrain = [[0,180],[370,40],[690,265],[1010,20],[1395,150],[1530,470],[1170,620],[830,505],[510,720],[175,540],[-230,695]]
const angles = [-125,-93,102,-79,-56,17,78,215,104,150,-162]
const point = (c: XYPosition, degrees: number, r: number) => ({
  x:c.x+Math.cos(degrees*Math.PI/180)*r, y:c.y+Math.sin(degrees*Math.PI/180)*r,
})

export function makeAtlas(modules: Section[]) {
  const nodes: AtlasNode[] = []
  const edges: Trail[] = []
  // Existing numbered modules keep their placement if their titles or source order change.
  // Unknown or duplicate numbers receive additional slots beyond the approved atlas.
  const slots = new Map<string, number>()
  const used = new Set<number>()
  for (const module of [...modules].sort((a,b)=>a.id.localeCompare(b.id))) {
    const number = /^Module (\d+)$/i.exec(codeOf(module))
    const slot = number ? Number(number[1]) : -1
    if(slot>=0 && slot<terrain.length && !used.has(slot)){
      used.add(slot)
      slots.set(module.id,slot)
    }
  }
  let extra = terrain.length
  for (const module of [...modules].sort((a,b)=>a.id.localeCompare(b.id))) {
    if(!slots.has(module.id)) slots.set(module.id,extra++)
  }
  const position = (slot:number):XYPosition => slot<terrain.length
    ? {x:terrain[slot][0],y:terrain[slot][1]}
    : {x:2010+(slot-terrain.length)*440,y:210+((slot-terrain.length)%3)*105}
  const occupied = [...slots.values()].map(slot=>({point:position(slot),radius:54}))
  function trail(source: string,target: string,path: string,index: number,owner: string,completed: boolean,route=false) {
    edges.push({id:source+'-'+target,source,target,type:'trail',selectable:false,
      data:{path,color:accents[index%accents.length],owner,completed,route}})
  }
  modules.forEach((module,sequence) => {
    const i=slots.get(module.id)!
    const center=position(i)
    const data = {section:module,hub:true,index:i,owner:module.id,ordinal:0}
    nodes.push({id:module.id, type:'skill',origin:[0.5,0.5],position:center,width:76,height:76,data})
    if(sequence) {
      const previous=modules[sequence-1]
      const prev=position(slots.get(previous.id)!), dx=center.x-prev.x, dy=center.y-prev.y
      trail(previous.id,module.id,`M ${prev.x} ${prev.y} C ${prev.x+dx*.53} ${prev.y+dy*.06}, ${center.x-dx*.47} ${center.y-dy*.1}, ${center.x} ${center.y}`,i,module.id,module.statistics.sessionTopics.state==='COMPLETED' && previous.statistics.sessionTopics.state==='COMPLETED',true)
    }
    const sessions=ordered(module.children,'SESSION')
    // Each arm has a shared trunk, then forks to at most three distinct terminals.
    const arms=Math.ceil(sessions.length/3)
    sessions.forEach((session,j)=>{
      const arm=Math.floor(j/3), leaf=j%3
      const seed=(i*13+arm*7)%11
      const bearing=angles[i%angles.length]+(arm%5-(Math.min(arms,5)-1)/2)*(71+seed*1.7)
      const joint=point(center,bearing,52+seed*3)
      const angle=bearing+[-37,9,52][leaf]+seed-5
      let radius=[43+seed,103+seed*3,66+seed*2][leaf]+Math.floor(arm/5)*125
      let tip=point(joint,angle,radius)
      while(occupied.some(existing=>Math.hypot(existing.point.x-tip.x,existing.point.y-tip.y)<existing.radius+19)){
        radius+=25
        tip=point(joint,angle,radius)
      }
      occupied.push({point:tip,radius:19})
      const curve=point(joint,bearing+(leaf-1)*19,34+seed)
      nodes.push({id:session.id,type:'skill',origin:[0.5,0.5],position:tip,width:30,height:30,
        data:{...data,section:session,hub:false,ordinal:j}})
      trail(module.id,session.id,`M ${center.x} ${center.y} Q ${(center.x+joint.x)/2+7} ${(center.y+joint.y)/2-8} ${joint.x} ${joint.y} Q ${curve.x} ${curve.y} ${tip.x} ${tip.y}`,i,module.id,session.statistics.sessionTopics.state==='COMPLETED')
    })
  })
  return {nodes,edges}
}
