import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const lessons=JSON.parse(await readFile(new URL('../src/data/greenhouse.json',import.meta.url),'utf8'))
const kinds=new Set(['predict','experiment','order','debug','choose','code'])
assert.equal(lessons.length,8,'A chapter contains eight reviewed lessons')
assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length,'Unique stable IDs')
for(const [i,l] of lessons.entries()){
 assert.equal(l.id,`greenhouse-v1-0${i+1}`)
 assert.ok(Number.isInteger(l.version)&&l.version>0,`${l.id}: version`)
 assert.ok(kinds.has(l.kind),`${l.id}: supported interaction`)
 for(const field of ['title','skill','goal','story','example','walkthrough','task','starter','solution','why'])assert.ok(typeof l[field]==='string'&&l[field].trim(),`${l.id}: ${field}`)
 assert.ok(l.theory.length>=2&&l.theory.every(t=>typeof t==='string'&&t.trim()),`${l.id}: explanation`)
 assert.equal(l.hints.length,3,`${l.id}: three progressive hints`)
 assert.ok(l.hints.every(t=>typeof t==='string'&&t.trim()))
 assert.ok(l.minutes>=2&&l.minutes<=20&&l.xp>0)
 if(l.kind==='predict'||l.kind==='choose'){assert.ok(l.options.length>=2);assert.ok(l.correct>=0&&l.correct<l.options.length)}
 for(const text of [l.example,l.starter,l.solution,...l.hints])assert.ok(!/TODO|FIXME/.test(text),`${l.id}: unfinished authoring`)
}
console.log(`Content validation passed: ${lessons.length} lessons, ${new Set(lessons.map(l=>l.kind)).size} interaction types.`)
