import test from 'node:test'
import assert from 'node:assert/strict'
import { canWalk, movePlayer, findPath, SPAWN, buildings, trees } from '../src/adventure/world.ts'
const closed={gate:false,bridge:false},gate={gate:true,bridge:false},open={gate:true,bridge:true}
test('spawn is on dry walkable ground',()=>assert.ok(canWalk(SPAWN,closed)))
test('shore, river, buildings and trees block movement',()=>{
  for(const point of [{x:30,z:0},{x:3,z:4},...buildings.map(b=>({x:b.x,z:b.z})),...trees.map(([x,z])=>({x,z}))])assert.equal(canWalk(point,open),false)
})
test('gate opens only after gate quest; fence stays solid',()=>{
  assert.equal(canWalk({x:-3,z:0},closed),false)
  assert.equal(canWalk({x:-3,z:0},gate),true)
  assert.equal(canWalk({x:-3,z:3},open),false)
})
test('bridge permits the crossing without allowing walking on river',()=>{
  assert.equal(canWalk({x:3,z:0},gate),false)
  assert.equal(canWalk({x:3,z:0},open),true)
  assert.equal(canWalk({x:3,z:2},open),false)
})
test('manual movement cannot enter closed gate',()=>assert.deepEqual(movePlayer({x:-3.5,z:0},.2,0,closed),{x:-3.5,z:0}))
test('routes respect story barriers',()=>{
  assert.equal(findPath(SPAWN,{x:0,z:1},closed).length,0)
  assert.ok(findPath(SPAWN,{x:0,z:1},gate).length>0)
  assert.equal(findPath(SPAWN,{x:8,z:-1},gate).length,0)
  const path=findPath(SPAWN,{x:8,z:-1},open)
  assert.ok(path.length>0)
  assert.ok(path.every(p=>canWalk(p,open)))
})
test('pathfinding recovers next to river edge instead of snapping into water',()=>{
  assert.ok(findPath({x:1.79,z:0},{x:0,z:1},gate).length>0)
})
test('non-finite coordinates cannot enter world',()=>assert.equal(canWalk({x:NaN,z:0},open),false))
