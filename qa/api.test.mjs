import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const dir = mkdtempSync(join(tmpdir(), 'learn-code-qa-'))
const port = 4197
const origin = 'http://127.0.0.1:' + port
let child
async function start() {
  child = spawn(process.execPath, ['server/index.mjs'], { cwd: resolve('.'), env: { ...process.env, PORT: String(port), DB_PATH: join(dir,'test.sqlite') }, stdio: 'pipe' })
  let log = ''
  child.stderr.on('data', b => { log += b })
  for (let i=0;i<60;i++) {
    if (child.exitCode !== null) throw new Error(log)
    try { if ((await fetch(origin+'/api/health')).ok) return } catch {}
    await delay(50)
  }
  throw new Error('Server did not start: '+log)
}
async function stop() {
  if (!child || child.exitCode !== null) return
  const exited = new Promise(r=>child.once('exit',r))
  child.kill(); await exited
}
const key = randomUUID()
const headers = { 'Content-Type':'application/json', 'X-Profile-Key':key }
const state = { version:1,xp:120,completed:['python-first-contact'],completedAt:{'python-first-contact':'2026-11-07T10:00:00.000Z'},drafts:{'python-first-contact':'hero.move("right")'},activity:[0,0,0,0,0,1,0],streak:1,lastCompletionDate:'2026-11-07',sound:false,motion:true }
const put = (value, h=headers) => fetch(origin+'/api/progress',{method:'PUT',headers:h,body:JSON.stringify(value)})
test('SQLite API: validation, isolation, persistence and static hosting', async t => {
  try {
    await start()
    await t.test('database health',async()=>assert.deepEqual(await (await fetch(origin+'/api/health')).json(),{ok:true,storage:'sqlite'}))
    await t.test('profile key required',async()=>assert.equal((await fetch(origin+'/api/progress')).status,401))
    await t.test('new profile is empty',async()=>assert.equal((await (await fetch(origin+'/api/progress',{headers})).json()).progress,null))
    await t.test('save and read exact Unicode/code state',async()=>{ assert.equal((await put(state)).status,200); assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,state) })
    await t.test('separate learners cannot read this profile',async()=>assert.equal((await (await fetch(origin+'/api/progress',{headers:{'X-Profile-Key':randomUUID()}})).json()).progress,null))
    await t.test('reject malformed state and unknown missions',async()=>{ for (const s of [{},{...state,xp:-1},{...state,completed:['bad']},{...state,drafts:{bad:'x'}},{...state,motion:'true'}]) assert.equal((await put(s)).status,400) })
    await t.test('reject duplicate completion',async()=>assert.equal((await put({...state,completed:['python-first-contact','python-first-contact']})).status,400))
    await t.test('reject malformed JSON and body overflow',async()=>{ assert.equal((await fetch(origin+'/api/progress',{method:'PUT',headers,body:'{'})).status,400); assert.equal((await put({...state,excess:'x'.repeat(1600000)})).status,413) })
    await t.test('unsupported method and content type',async()=>{ assert.equal((await fetch(origin+'/api/progress',{method:'DELETE',headers})).status,405); assert.equal((await put(state,{'X-Profile-Key':key})).status,415) })
    await t.test('Python lessons, quizzes and Unicode drafts roundtrip',async()=>{ const s={...state,xp:90,completed:['python-v2-01','python-v2-01-quiz'],drafts:{'python-v2-01':'print("Привет, космос!")'}}; assert.equal((await put(s)).status,200); assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,s); await put(state) })
    await t.test('island quest progress roundtrip',async()=>{ const s={...state,xp:310,completed:['island-v1-hello','island-v1-gate','island-v1-bridge','island-v1-beacon'],drafts:{'island-v1-gate':'password = "маяк"'}}; assert.equal((await put(s)).status,200); assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,s); await put(state) })
    await t.test('game lab progress and code drafts roundtrip',async()=>{ const levels=JSON.parse(readFileSync('src/data/game-lab.json','utf8')); const s={...state,xp:levels.reduce((n,l)=>n+l.xp,0),completed:levels.map(l=>l.id),drafts:{'lab-v1-flex-01':'justify-content: flex-end;','lab-v1-robot-01':JSON.stringify({language:'go',blocks:[{direction:'right',count:2}]})}}; assert.equal((await put(s)).status,200); assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,s); await put(state) })
    await t.test('mechanism orders and Python drafts roundtrip',async()=>{ const missions=JSON.parse(readFileSync('src/data/mechanism-missions.json','utf8'));const s={...state,xp:missions.reduce((n,m)=>n+m.xp,0),completed:missions.map(m=>m.id),drafts:{'mechanism-v1-launch':missions[5].solution}};assert.equal((await put(s)).status,200);assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,s);await put(state) })
    await t.test('database survives server restart',async()=>{ await stop(); await start(); assert.deepEqual((await (await fetch(origin+'/api/progress',{headers})).json()).progress,state) })
    await t.test('SPA and missing assets',async()=>{ assert.equal((await fetch(origin+'/')).status,200); assert.equal((await fetch(origin+'/some-route')).status,200); assert.equal((await fetch(origin+'/assets/not-real.js')).status,404) })
  } finally { await stop(); rmSync(dir,{recursive:true,force:true}) }
})
