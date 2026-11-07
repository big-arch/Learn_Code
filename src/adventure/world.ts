export interface Position { x: number; z: number }
export interface WorldState { gate: boolean; bridge: boolean }
export const SPAWN: Position = { x: -9, z: 5 }
export const buildings = [
  { x: -10, z: -3, width: 3, depth: 2.6, color: '#eee0b4', roof: '#c77858', kind: 'home' },
  { x: -5.8, z: -4.7, width: 2.6, depth: 2.3, color: '#dfbf8e', roof: '#5e8a84', kind: 'workshop' },
  { x: 9, z: -4.1, width: 2.1, depth: 2.1, color: '#f2e7c7', roof: '#cf755c', kind: 'lighthouse' },
] as const
export const trees = [
  [-10, -5.8],[-7.6,-6.3],[-11.2,0.1],[-11.4,3.2],[-6.5,4.4],[-4.7,6.5],
  [-0.8,-5.8],[0.7,5.6],[6.6,5.2],[10.3,2.1],[7,-6.2],[4.4,-6.6],
] as const
export function canWalk(p: Position, state: WorldState): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false
  if ((p.x / 12.5) ** 2 + (p.z / 8.35) ** 2 > 1) return false
  if (p.x > 1.8 && p.x < 5.2 && !(state.bridge && Math.abs(p.z) < 0.95)) return false
  if (Math.abs(p.x + 3) < 0.4 && !(state.gate && Math.abs(p.z) < 1.05)) return false
  if (buildings.some(b => Math.abs(p.x-b.x) < b.width/2+0.3 && Math.abs(p.z-b.z) < b.depth/2+0.3)) return false
  if (trees.some(([x,z]) => Math.hypot(p.x-x,p.z-z) < 0.55)) return false
  return true
}
export function movePlayer(from: Position, dx: number, dz: number, state: WorldState): Position {
  const next = { ...from }
  // Sliding against obstacles keeps manual movement comfortable.
  if (canWalk({ x: next.x + dx, z: next.z }, state)) next.x += dx
  if (canWalk({ x: next.x, z: next.z + dz }, state)) next.z += dz
  return next
}
export function findPath(from: Position, to: Position, state: WorldState): Position[] {
  const snap = (p: Position) => ({ x: Math.round(p.x*2)/2, z: Math.round(p.z*2)/2 })
  const rounded = snap(from), target = snap(to)
  const starts:Position[]=[]
  for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5])starts.push({x:rounded.x+dx,z:rounded.z+dz})
  const start=starts.filter(p=>canWalk(p,state)&&[.25,.5,.75].every(t=>canWalk({x:from.x+(p.x-from.x)*t,z:from.z+(p.z-from.z)*t},state))).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0]
  if (!start || !canWalk(target,state)) return []
  const key = (p: Position) => p.x+','+p.z
  const queue = [start], parents = new Map<string,Position|null>([[key(start),null]])
  for(let i=0;i<queue.length && i<2300;i++) {
    const p = queue[i]
    if(key(p)===key(target)) {
      const path: Position[] = []
      let node: Position|null = p
      while(node && parents.get(key(node)) !== null) { path.unshift(node); node=parents.get(key(node))??null }
      return Math.hypot(start.x-from.x,start.z-from.z)>.05?[start,...path]:path
    }
    for(const [dx,dz] of [[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]]) {
      const next={x:p.x+dx,z:p.z+dz}
      if(!parents.has(key(next))&&canWalk(next,state)) { parents.set(key(next),p);queue.push(next) }
    }
  }
  return []
}
