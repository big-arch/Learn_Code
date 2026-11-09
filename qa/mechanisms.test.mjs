import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {loadPyodide} from '../public/python/314.0.7/pyodide.mjs'
import {build} from 'vite'
import {resolve} from 'node:path'
const missions=JSON.parse(await readFile(new URL('../src/data/mechanism-missions.json',import.meta.url),'utf8'))
const harness=await readFile(new URL('../src/workers/python-harness.py',import.meta.url),'utf8')
const runtime=await loadPyodide({indexURL:fileURLToPath(new URL('../public/python/314.0.7/',import.meta.url))})
const run=(code,checks=[])=>{runtime.globals.set('__arena_request',JSON.stringify({code,checks,stdin:''}));return JSON.parse(runtime.runPython(harness))}
for(const m of missions){
  test(m.id+' solution passes real Python checks',()=>{const r=run(m.solution,m.checks);assert.equal(r.error,'');assert.ok(r.tests.every(t=>t.passed));assert.ok(r.trace.length>0)})
  test(m.id+' incomplete starter never awards completion',()=>{const r=run(m.starter,m.checks);assert.ok(r.error||r.tests.some(t=>!t.passed))})
  test(m.id+' teaching example executes',()=>{const r=run(m.example);assert.equal(r.error,'');assert.ok(r.trace.length>1)})
}
test('hardcoded outputs do not pass formula lessons',()=>{
  for(const [i,code] of [[1,'crystals=4\npower=12'],[2,'start=2\nbuckets=2\nwater=6'],[3,'dial="2"\nspeed=4'],[4,'place="Бухта"\nlabel="Бухта: мастерская"']])assert.ok(run(code,missions[i].checks).tests.some(t=>!t.passed))
})
test('string and bool values do not pass numeric regulator checks',()=>{
  for(const code of ['power="3"','power=True','power=-3'])assert.ok(run(code,missions[0].checks).tests.some(t=>!t.passed))
})
const bundle=await build({configFile:false,logLevel:'silent',build:{lib:{entry:resolve('src/lib/mechanisms.ts'),formats:['es']},write:false,minify:false}})
const {mechanismState}=await import('data:text/javascript;base64,'+Buffer.from((Array.isArray(bundle)?bundle[0]:bundle).output.find(o=>o.type==='chunk').code).toString('base64'))
test('scene clamps extreme numbers, rejects text as power and preserves labels',()=>{
  assert.deepEqual(mechanismState([{name:'power',type:'str',value:"'12'"},{name:'water',type:'int',value:'999999'},{name:'speed',type:'float',value:'inf'},{name:'label',type:'str',value:"'Бухта: мастерская'"}]),{power:0,water:10,speed:0,label:'Бухта: мастерская'})
})
test('trace reveals real before/after device values',()=>{
  const r=run('power=1\npower=power+2');assert.equal(mechanismState(r.trace[0].variables).power,1);assert.equal(mechanismState(r.trace[1].variables).power,3)
})
