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
