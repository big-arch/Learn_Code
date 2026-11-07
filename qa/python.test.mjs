import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadPyodide } from '../public/python/314.0.7/pyodide.mjs'
const course = JSON.parse(await readFile(new URL('../src/data/python-course.json', import.meta.url), 'utf8'))
const harness = await readFile(new URL('../src/workers/python-harness.py', import.meta.url), 'utf8')
const runtime = await loadPyodide({ indexURL: fileURLToPath(new URL('../public/python/314.0.7/', import.meta.url)) })
const run = (code, checks = [], stdin = '') => {
  runtime.globals.set('__arena_request', JSON.stringify({ code, checks, stdin }))
  return JSON.parse(runtime.runPython(harness))
}
test('Python course: actual interpreter, all lessons and failures', async t => {
  assert.equal(course.lessons.length, 24)
  assert.equal(new Set(course.lessons.map(l => l.id)).size, 24)
  for (const lesson of course.lessons) {
    await t.test(lesson.id + ' solution passes', () => {
      const r = run(lesson.solution, lesson.checks, lesson.stdin)
      assert.equal(r.error, '', JSON.stringify(r))
      assert.ok(r.tests.length > 0 && r.tests.every(v => v.passed), JSON.stringify(r))
      assert.ok(lesson.quiz.correct >= 0 && lesson.quiz.correct < lesson.quiz.options.length)
    })
    await t.test(lesson.id + ' starter cannot complete', () => {
      const r = run(lesson.starter, lesson.checks, lesson.stdin)
      assert.ok(r.error || r.tests.some(v => !v.passed), 'Starter must require student work')
    })
    await t.test(lesson.id + ' theory example output', () => {
      const r = run(lesson.example, [], lesson.stdin)
      assert.equal(r.error, '', JSON.stringify(r))
      assert.equal(r.output.trim(), lesson.exampleOutput.trim())
    })
  }
  const island = JSON.parse(await readFile(new URL('../src/data/adventure-quests.json', import.meta.url), 'utf8'))
  for (const q of island) {
    await t.test(q.id + ' solution passes', () => { const r=run(q.solution,q.checks,q.stdin); assert.equal(r.error,''); assert.ok(r.tests.every(c=>c.passed),JSON.stringify(r)) })
    await t.test(q.id + ' starter rejected', () => { const r=run(q.starter,q.checks,q.stdin); assert.ok(r.error||r.tests.some(c=>!c.passed)) })
  }
  for(const greeting of ['привет','ПрИвЕт!!!','Привет, Мира!','  здравствуй, Мира  ']) {
    await t.test('Mira accepts greeting: '+greeting,()=>{const r=run('print('+JSON.stringify(greeting)+')',island[0].checks);assert.ok(r.tests.every(c=>c.passed),JSON.stringify(r))})
  }
  for(const output of ['4','не привет','привет пока']) {
    await t.test('Mira rejects unrelated output: '+output,()=>{const r=run('print('+JSON.stringify(output)+')',island[0].checks);assert.ok(r.tests.some(c=>!c.passed))})
  }
  await t.test('island beacon rejects hardcoded energy', () => {const q=island[3],r=run('crystals = int(input())\npower = 12\nprint(power)',q.checks,q.stdin);assert.ok(r.tests.some(c=>!c.passed))})
  await t.test('trace records input conversion and addition after each line',()=>{
    const r=run('value = input()\nnumber = int(value)\nanswer = number + 10\nprint(answer)',[],'7')
    assert.deepEqual(r.trace.map(s=>s.line),[1,2,3,4])
    assert.deepEqual(r.trace[0].variables,[{name:'value',type:'str',value:"'7'"}])
    assert.equal(r.trace[1].variables.find(v=>v.name==='number').type,'int')
    assert.equal(r.trace[2].variables.find(v=>v.name==='answer').value,'17')
    assert.equal(r.trace[3].output,'17\n')
  })
  await t.test('trace shows real loop iterations',()=>{
    const r=run('total = 0\nfor n in range(3):\n    total += n\nprint(total)')
    assert.deepEqual(r.trace.filter(s=>s.line===3).map(s=>s.variables.find(v=>v.name==='total').value),['0','1','3'])
  })
  await t.test('trace captures local function arguments and error recovery',()=>{
    const r=run('def double(n):\n    return n * 2\nanswer = double(5)')
    assert.equal(r.trace.find(s=>s.scope==='double').variables.find(v=>v.name==='n').value,'5')
    const failed=run('value = 1\nprint(1 / 0)');assert.equal(failed.trace.at(-1).event,'exception')
    assert.equal(run('print(4)').output,'4\n')
  })
  await t.test('trace does not call custom repr even inside a container',()=>{
    const r=run('class Item:\n    def __repr__(self):\n        print("unexpected side effect")\n        return "item"\nitems = [Item()]\nprint("ok")')
    assert.equal(r.output,'ok\n');assert.equal(r.error,'')
    assert.equal(r.variables.find(v=>v.name==='items').value,'[<Item>]')
  })
  await t.test('trace is bounded without truncating execution',()=>{
    const r=run('total = 0\nfor n in range(1000):\n    total += 1\nprint(total)')
    assert.equal(r.trace.length,120);assert.equal(r.traceTruncated,true);assert.equal(r.output,'1000\n')
  })
  await t.test('syntax error identifies student line', () => assert.match(run('print(').error, /SyntaxError, строка 1/))
  await t.test('missing input gets explanatory EOFError', () => assert.match(run('input()').error, /EOFError/))
  await t.test('stdout bounded', () => assert.match(run('print("x" * 13000)').error, /12 000/))
  await t.test('student files isolated between runs', () => {
    run('open("secret.txt", "w").write("old")')
    assert.match(run('open("secret.txt").read()').error, /FileNotFoundError/)
  })
  await t.test('if task rejects hardcoded status', () => {
    const l = course.lessons[7]
    const r = run('fuel = 25\nstatus = "Старт"\nif True: pass\nprint(status)', l.checks)
    assert.ok(r.tests.some(v => !v.passed))
  })
})

const video = JSON.parse(await readFile(new URL('../src/data/python-video.json', import.meta.url), 'utf8'))
test('Video practice: real Python solutions and incomplete attempts', async t => {
  for (const lab of video.labs) {
    await t.test(lab.id + ' solution passes with a real execution trace', () => {
      const result = run(lab.solution, lab.checks)
      assert.equal(result.error, '', JSON.stringify(result))
      assert.ok(result.tests.length && result.tests.every(check => check.passed), JSON.stringify(result))
      assert.ok(result.trace.length > 0)
    })
    await t.test(lab.id + ' starter does not falsely pass', () => {
      const result = run(lab.starter, lab.checks)
      assert.ok(result.error || result.tests.some(check => !check.passed))
    })
  }
  for (const [id, from, to] of [
    ['copy', 'backpack.copy()', 'backpack'],
    ['truth', 'negative.strip().lower() == "да"', 'bool(negative)'],
    ['sets', 'required - available', 'available - required'],
    ['comprehension', 'if value > 0', 'if value >= 0'],
    ['scope', 'fuel + 3', '8'],
    ['arguments', 'fuel=5', 'fuel=0'],
    ['errors', 'return int(text)', 'return 0'],
  ]) {
    await t.test(id + ' detects the concept mistake', () => {
      const lab = video.labs.find(item => item.id === id)
      const wrong = lab.solution.replace(from, to)
      assert.notEqual(wrong, lab.solution)
      const result = run(wrong, lab.checks)
      assert.ok(result.error || result.tests.some(check => !check.passed), JSON.stringify(result))
    })
  }
})
