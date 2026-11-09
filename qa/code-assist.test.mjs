import {test} from 'node:test'
import assert from 'node:assert/strict'
import {getCompletions,expandCompletion,editKey,languageFromFile} from '../src/lib/codeAssist.ts'

test('completion replaces the whole partially typed token and preserves existing arguments',()=>{
  const result=getCompletions('print("hello")',3,'python')
  assert.equal(result.from,0);assert.equal(result.to,5)
  assert.deepEqual(expandCompletion(result.items[0],'','("hello")'),{text:'print',start:5,end:5})
})
test('Python snippets select the editable part and preserve nested indentation',()=>{
  const result=getCompletions('    fo',6,'python')
  const snippet=expandCompletion(result.items[0],'    ','')
  assert.equal(snippet.text,'for i in range(3):\n        pass')
  assert.equal(snippet.text.slice(snippet.start,snippet.end),'3')
})
test('suggestions stay out of comments and strings, including triple quoted Python',()=>{
  for(const text of ['# pri','print("pri',"'''a\npri",'"escaped \\" pri'])assert.equal(getCompletions(text,text.length,'python', 'general',true).items.length,0)
  for(const [lang,text] of [['javascript','// con'],['css','/* jus'],['html','<!-- <d']])assert.equal(getCompletions(text,text.length,lang,'general',true).items.length,0)
  assert.equal(getCompletions('# comment\npri',13,'python').items[0].label,'print')
})
test('CSS workshop limits properties and suggests values for the property',()=>{
  assert.deepEqual(getCompletions('',0,'css','grid',true).items.map(i=>i.label),['grid-column','grid-row'])
  const s='justify-content: flex-e'
  assert.deepEqual(getCompletions(s,s.length,'css','flex').items.map(i=>i.label),['flex-end'])
  assert.ok(getCompletions('.',1,'css','selector').items.some(i=>i.label==='.mint'))
})
test('all robot languages offer the correct API and statement terminator',()=>{
  for(const [lang,call,suffix] of [['python','hero.move',''],['javascript','hero.move',';'],['csharp','Hero.Move',';'],['go','hero.Move','']]) {
    const result=getCompletions('',0,lang,'robot',true)
    assert.equal(expandCompletion(result.items[0],'','').text,`${call}("right")${suffix}`)
    assert.ok(result.items.some(i=>i.label==='for'))
  }
})
test('local variable names and HTML templates are available',()=>{
  const text='captain = "Mira"\ncap';assert.ok(getCompletions(text,text.length,'python').items.some(i=>i.label==='captain'))
  assert.equal(expandCompletion(getCompletions('<d',2,'html').items[0],'','').text,'<div></div>')
  for(const [file,lang] of [['a.py','python'],['a.js','javascript'],['a.cs','csharp'],['a.go','go'],['a.html','html'],['a.css','css']])assert.equal(languageFromFile(file),lang)
})
test('pairs wrap selection, skip a closing symbol and delete an empty pair',()=>{
  assert.deepEqual(editKey('word',0,4,'"','python'),{value:'"word"',start:1,end:5})
  assert.deepEqual(editKey('()',1,1,')','python'),{value:'()',start:2,end:2})
  assert.deepEqual(editKey('""',1,1,'Backspace','python'),{value:'',start:0,end:0})
  assert.equal(editKey('# ',2,2,'(','python'),null)
  assert.equal(editKey('"text',5,5,'(','python'),null)
})
test('Enter indents Python and paired braces, not comments',()=>{
  assert.deepEqual(editKey('if True:',8,8,'Enter','python'),{value:'if True:\n    ',start:13,end:13})
  assert.deepEqual(editKey('{}',1,1,'Enter','javascript'),{value:'{\n    \n}',start:6,end:6})
  assert.equal(editKey('# comment:',10,10,'Enter','python').value,'# comment:\n')
})
test('Tab and Shift Tab indent a selection without eating the next line',()=>{
  const text='one\ntwo\nthree',edit=editKey(text,0,8,'Tab','python')
  assert.equal(edit.value,'    one\n    two\nthree')
  assert.equal(editKey(edit.value,edit.start,edit.end,'Tab','python',true).value,text)
})
