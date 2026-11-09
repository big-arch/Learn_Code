import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {loadPyodide} from '../public/python/314.0.7/pyodide.mjs'
const lessons=JSON.parse(await readFile(new URL('../src/data/practice-lessons.json',import.meta.url),'utf8'))
const harness=await readFile(new URL('../src/workers/python-harness.py',import.meta.url),'utf8')
const runtime=await loadPyodide({indexURL:fileURLToPath(new URL('../public/python/314.0.7/',import.meta.url))})
const run=(code,checks=[])=>{runtime.globals.set('__arena_request',JSON.stringify({code,checks,stdin:''}));return JSON.parse(runtime.runPython(harness))}
for(const lesson of lessons.filter(l=>l.track==='python')){
  test(lesson.id+' real Python solution',()=>{const r=run(lesson.solution,lesson.checks);assert.equal(r.error,'');assert.ok(r.tests.length);assert.ok(r.tests.every(t=>t.passed),JSON.stringify(r.tests));assert.equal(r.output.trim(),lesson.expected)})
  test(lesson.id+' starter is incomplete',()=>{const r=run(lesson.starter,lesson.checks);assert.ok(r.error||r.tests.some(t=>!t.passed))})
  test(lesson.id+' separate teaching example',()=>{const r=run(lesson.example);assert.equal(r.error,'');assert.equal(r.output.trim(),lesson.exampleOutput)})
}
test('hardcoded route, list and project are rejected on alternate inputs',()=>{
  const snippets={3:'weight=7\nroute="тележка"\nprint(route)',4:'weights=[2,7,1,6]\nheavy=[7,6]\nprint(heavy)',6:'weights=[2,7,1,6]\ndef postage(w):\n    return w*2+1\ntotal_fee=36\nheavy=[7,6]\nprint(total_fee)\nprint(heavy)'}
  for(const [n,code] of Object.entries(snippets)){const l=lessons[Number(n)-1];assert.ok(run(code,l.checks).tests.some(t=>!t.passed))}
})
test('equivalent comprehension and sum solution accepted',()=>{
  const l=lessons[5],r=run('weights=[2,7,1,6]\ndef postage(w):\n    return 2*w+1\ntotal_fee=sum(map(postage,weights))\nheavy=[w for w in weights if w>=5]\nprint(total_fee)\nprint(heavy)',l.checks)
  assert.equal(r.error,'');assert.ok(r.tests.every(t=>t.passed))
})
