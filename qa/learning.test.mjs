import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {normalizeEvidence,validEvidence,mergeEvidence} from '../shared/learning.mjs'
const event=(overrides={})=>({lesson:'greenhouse-v1-01',version:1,kind:'attempt',variant:'lesson',passed:true,helped:false,at:'2026-11-17T10:00:00.000Z',...overrides})
test('old profiles are compatible; malformed evidence is not stored',()=>{
 assert.ok(validEvidence(undefined));assert.deepEqual(normalizeEvidence(null),{})
 for(const e of [event({lesson:'unknown'}),event({version:0}),event({at:'yesterday'}),event({passed:'yes'}),event({kind:'anything'})]){const x={[randomUUID()]:e};assert.equal(validEvidence(x),false);assert.deepEqual(normalizeEvidence(x),{})}
})
test('merge of independent devices is deterministic and idempotent',()=>{
 const a={[randomUUID()]:event()},b={[randomUUID()]:event({helped:true,kind:'hint'})}
 assert.equal(Object.keys(mergeEvidence(a,b)).length,2)
 assert.deepEqual(mergeEvidence(a,b),mergeEvidence(b,a));assert.deepEqual(mergeEvidence(a,a),normalizeEvidence(a))
})
test('bounded history preserves successful review and used hints after repeated visits',()=>{
 const success=randomUUID(),hint=randomUUID(),x={[success]:event({variant:'review'}),[hint]:event({kind:'hint',helped:true,passed:false})}
 for(let i=0;i<100;i++)x[randomUUID()]=event({kind:'visit',passed:false,at:new Date(Date.UTC(2026,10,18,0,i)).toISOString()})
 const normalized=normalizeEvidence(x)
 assert.ok(Object.keys(normalized).length<=16);assert.ok(normalized[success]);assert.ok(normalized[hint]);assert.deepEqual(normalizeEvidence(normalized),normalized)
})
test('evidence contains no undeclared fields',()=>{const id=randomUUID();assert.equal(normalizeEvidence({[id]:event({privateData:'discard'})})[id].privateData,undefined)})
