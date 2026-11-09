import {test} from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'vite'
import {resolve} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
const result=await build({configFile:false,logLevel:'silent',build:{lib:{entry:resolve('src/lib/cloudProgress.ts'),formats:['es']},write:false,minify:false}})
const {CloudProgressStore}=await import('data:text/javascript;base64,'+Buffer.from((Array.isArray(result)?result[0]:result).output.find(o=>o.type==='chunk').code).toString('base64'))
const empty=()=>({version:1,xp:0,completed:[],completedAt:{},drafts:{},activity:[0,0,0,0,0,0,0],streak:0,lastCompletionDate:null,sound:true,motion:true})
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}}
const backend=()=>{
 let row={state:empty(),revision:0,epoch:0,accepted:true},online=true
 return {get row(){return structuredClone(row)},set online(v){online=v},call:async(revision,state,reset)=>{
   if(!online)throw Error('offline')
   if(state){if(revision!==row.revision)return {...structuredClone(row),accepted:false};row={state:structuredClone(reset?empty():state),revision:row.revision+1,epoch:row.epoch+(reset?1:0),accepted:true}}
   return structuredClone(row)
 }}
}
const complete=(s,id)=>({...s,completed:[...s.completed,id],completedAt:{...s.completedAt,[id]:new Date().toISOString()}})
test('two devices merge achievements and independent drafts without duplicate XP',async()=>{
 const b=backend(),a=new CloudProgressStore('a',b.call,memory()),c=new CloudProgressStore('a',b.call,memory())
 try{await a.sync();await c.sync();a.change(s=>({...complete(s,'lab-v1-flex-01'),drafts:{a:'left'}}));c.change(s=>({...complete(s,'lab-v1-flex-02'),drafts:{b:'right'}}));await a.sync();await c.sync();await a.sync();assert.deepEqual(a.getSnapshot().progress.completed.sort(),['lab-v1-flex-01','lab-v1-flex-02']);assert.equal(a.getSnapshot().progress.xp,130);assert.deepEqual(a.getSnapshot().progress.drafts,{a:'left',b:'right'});await a.sync();assert.equal(a.getSnapshot().progress.xp,130)}finally{a.dispose();c.dispose()}
})
test('same draft conflict preserves both versions until explicit resolution',async()=>{
 const b=backend(),a=new CloudProgressStore('a',b.call,memory()),c=new CloudProgressStore('a',b.call,memory())
 try{await a.sync();await c.sync();a.change(s=>({...s,drafts:{code:'first'}}));c.change(s=>({...s,drafts:{code:'second'}}));await a.sync();await c.sync();assert.deepEqual(c.getSnapshot().conflicts.code,{local:'second',remote:'first'});assert.equal(b.row.state.drafts.code,'first');c.change(s=>({...s,drafts:{code:'second edited'}}));await c.sync();assert.equal(c.getSnapshot().conflicts.code.local,'second edited');c.resolve('code','local');await delay(15);assert.equal(b.row.state.drafts.code,'second edited');assert.deepEqual(c.getSnapshot().conflicts,{})}finally{a.dispose();c.dispose()}
})
test('offline edits survive reload and synchronize when back online',async()=>{
 const b=backend(),storage=memory(),a=new CloudProgressStore('a',b.call,storage)
 await a.sync();b.online=false;a.change(s=>({...s,drafts:{code:'offline'}}));await a.sync();a.dispose()
 const c=new CloudProgressStore('a',b.call,storage)
 try{assert.equal(c.getSnapshot().progress.drafts.code,'offline');b.online=true;await c.sync();assert.equal(b.row.state.drafts.code,'offline')}finally{c.dispose()}
})
test('first connection failure does not discard edits made before initial download',async()=>{
 const b=backend(),a=new CloudProgressStore('a',b.call,memory())
 try{b.online=false;await a.sync();a.change(s=>({...s,drafts:{code:'new offline'}}));b.online=true;await a.sync();assert.equal(b.row.state.drafts.code,'new offline')}finally{a.dispose()}
})
test('server reset prevents stale device from resurrecting progress and keeps a backup',async()=>{
 const b=backend(),a=new CloudProgressStore('a',b.call,memory()),c=new CloudProgressStore('a',b.call,memory())
 try{await a.sync();a.change(s=>complete(s,'lab-v1-flex-01'));await a.sync();await c.sync();await a.reset();c.change(s=>({...s,drafts:{code:'stale'}}));await c.sync();assert.equal(b.row.epoch,1);assert.deepEqual(b.row.state.completed,[]);assert.deepEqual(c.getSnapshot().progress.completed,[]);assert.equal(c.getSnapshot().backup.drafts.code,'stale')}finally{a.dispose();c.dispose()}
})
test('guest import merges achievements and reports competing drafts',async()=>{
 const b=backend(),a=new CloudProgressStore('a',b.call,memory())
 try{await a.sync();a.change(s=>({...complete(s,'lab-v1-flex-01'),drafts:{code:'account'}}));await a.sync();a.importGuest({...complete(empty(),'lab-v1-flex-02'),drafts:{code:'guest'}});await delay(15);assert.equal(a.getSnapshot().progress.xp,130);assert.deepEqual(a.getSnapshot().conflicts.code,{local:'guest',remote:'account'})}finally{a.dispose()}
})
test('account caches do not leak into another account',async()=>{
 const storage=memory(),b=backend(),a=new CloudProgressStore('a',b.call,storage)
 try{await a.sync();a.change(s=>({...s,drafts:{code:'private'}}));await a.sync();const c=new CloudProgressStore('b',backend().call,storage);try{assert.deepEqual(c.getSnapshot().progress.drafts,{})}finally{c.dispose()}}finally{a.dispose()}
})
test('edits made while a save is in flight remain pending, then upload',async()=>{
 const b=backend();let release,entered;const writing=new Promise(r=>entered=r)
 const a=new CloudProgressStore('a',async(rev,state,reset)=>{if(state&&state.drafts.code==='v1'){entered();await new Promise(r=>release=r)}return b.call(rev,state,reset)},memory())
 try{await a.sync();a.change(s=>({...s,drafts:{code:'v1'}}));const saving=a.sync();await writing;a.change(s=>({...s,drafts:{code:'v2'}}));release();await saving;assert.equal(a.getSnapshot().progress.drafts.code,'v2');await a.sync();assert.equal(b.row.state.drafts.code,'v2')}finally{a.dispose()}
})
