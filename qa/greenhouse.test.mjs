import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {build} from 'vite'
import {loadPyodide} from '../public/python/314.0.7/pyodide.mjs'
const result=await build({configFile:false,logLevel:'silent',build:{lib:{entry:resolve('src/lib/greenhouse.ts'),formats:['es']},write:false,minify:false}})
const code=(Array.isArray(result)?result[0]:result).output.find(o=>o.type==='chunk').code
const {greenhouseLessons,greenText,greenSource,greenChecks,greenState,defaultSensors}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const harness=await readFile(new URL('../src/workers/python-harness.py',import.meta.url),'utf8')
const runtime=await loadPyodide({indexURL:fileURLToPath(new URL('../public/python/314.0.7/',import.meta.url))})
const run=(fragment,index,review=false)=>{runtime.globals.set('__arena_request',JSON.stringify({code:greenSource(greenText(fragment,review),defaultSensors),checks:index===null?[]:greenChecks(index,review),stdin:''}));return JSON.parse(runtime.runPython(harness))}
const pass=r=>!r.error&&r.tests.length>0&&r.tests.every(t=>t.passed)
for(const [i,l] of greenhouseLessons.entries()){
 for(const review of [false,true])test(`${l.id} ${review?'review':'lesson'} solution and example execute in real Python`,()=>{const r=run(l.solution,i,review);assert.ok(pass(r),JSON.stringify(r));assert.equal(run(l.example,null,review).error,'');assert.ok(r.trace.length>0)})
 if(!['predict','choose'].includes(l.kind))test(`${l.id} starter needs a learner change`,()=>assert.equal(pass(run(l.starter,i)),false))
}
test('boundary, empty tank, invalid sensor and independent devices reject common mistakes',()=>{
 for(const [i,fragment] of [[1,'water=True'],[1,'water=1'],[3,'water=moisture<=35'],[4,'water=moisture<35 or tank>0'],[5,'fan=temperature>=28'],[6,'water=False\nfan=False\nif moisture<35 and tank>0:\n    water=True\nelif temperature>28:\n    fan=True'],[7,'mode="полив" if moisture<35 else "пауза"']])assert.equal(pass(run(fragment,i)),false,fragment)
})
test('equivalent conditions and alternative valid structures are accepted',()=>{
 assert.ok(pass(run('water = not (moisture >= 35)',1)))
 assert.ok(pass(run('water=False\nif tank>0:\n    if moisture<35:\n        water=True',4)))
 assert.ok(pass(run('fan=False\nif temperature>28:\n    fan=True',5)))
})
test('old thresholds cannot pass the changed-data review',()=>{
 for(const i of [1,3,5,6,7])assert.equal(pass(run(greenText(greenhouseLessons[i].solution),i,true)),false)
})
test('wrong types do not turn scene devices on; error mode always stops watering',()=>{
 assert.equal(greenState([{name:'water',type:'str',value:"'True'"}]).water,null)
 assert.equal(greenState([{name:'water',type:'bool',value:'True'},{name:'mode',type:'str',value:"'ошибка'"}]).water,false)
 assert.equal(greenState([{name:'mode',type:'str',value:"'полив'"}]).water,true)
})
