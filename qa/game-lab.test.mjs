import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { blocksToCode, labStyle } from '../src/lib/gameLabEngine.ts'
import { validateMission } from '../src/lib/missionEngine.ts'
const levels = JSON.parse(readFileSync(new URL('../src/data/game-lab.json', import.meta.url)))
for (const language of ['python','javascript','csharp','go']) {
  for (const level of levels.filter(l=>l.mode==='robot')) {
    test(`${language}: ${level.title} executes generated blocks`,()=>{
      const blocks=[]
      for(const direction of level.solution.split(',')) {
        const last=blocks.at(-1)
        if(level.loop && last?.direction===direction) last.count++
        else blocks.push({direction,count:1})
      }
      const code=blocksToCode(blocks,language)
      const course={id:language,mission:{kind:'robot',start:level.start,goal:level.goal,expectedSteps:level.steps,requireLoop:level.loop}}
      const result=validateMission(course,code)
      assert.equal(result.ok,true,JSON.stringify(result))
      assert.deepEqual(result.positions.at(-1),level.goal)
      assert.equal(result.commands.length,level.steps)
      assert.equal(validateMission(course,code+'\nprint("done")').ok,false)
    })
  }
}
test('CSS restrictions reject unrelated properties, resource URLs and malformed declarations',()=>{
  for(const source of ['position:fixed;','background:url(https://example.com);','justify-content:center:bad;','justify-content:banana;','@import "x";','grid-column:1 / 99999;']) {
    assert.ok(labStyle(source,source.startsWith('grid')?'grid':'flex').error,source)
  }
})
test('lesson examples parse, comments are ignored and equivalent Grid span is supported',()=>{
  for(const level of levels.filter(l=>['flex','grid'].includes(l.mode))) assert.equal(labStyle(level.solution,level.mode).error,'',level.id)
  assert.deepEqual(labStyle('/* ignore position:fixed; */ justify-content: center;', 'flex').style,{justifyContent:'center'})
  assert.equal(labStyle('grid-column: 2 / span 2;', 'grid').style.gridColumn,'2 / span 2')
})
test('robot rejects leaving board, fake loop in a comment and unbounded execution',()=>{
  const course={id:'python',mission:{kind:'robot',start:{x:0,y:2},goal:{x:2,y:0},expectedSteps:4,requireLoop:true}}
  for(const source of ['hero.move("left")', '# for i in range(2):\nhero.move("right")\nhero.move("right")\nhero.move("up")\nhero.move("up")','for i in range(99999):\n    hero.move("up")']) assert.equal(validateMission(course,source).ok,false)
})
