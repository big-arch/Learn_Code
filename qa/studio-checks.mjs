export default async function studioChecks(page) {
  // Use a fresh disposable browser context; never clear the user's browser storage.
  page.setDefaultTimeout(12000)
  const report = { checks: [], errors: [] }
  const check = (ok, name) => { if (!ok) throw Error(name); report.checks.push(name) }
  page.on('pageerror', e => report.errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:5175')
  await page.getByRole('button', { name: 'Начать с нуля', exact: true }).click()
  const lesson = await page.evaluate(async () => (await import('/src/data/pythonCourse.ts')).pythonLessons[0])
  await page.getByRole('tab', { name: '02 Проверить себя' }).click()
  await page.getByRole('radio').nth((lesson.quiz.correct + 1) % lesson.quiz.options.length).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  check((await page.locator('.quiz-feedback').innerText()).includes('Давай разберёмся'), 'wrong quiz explains without punishment')
  const xp = () => page.evaluate(() => JSON.parse(localStorage.getItem('code-arena-progress-v1')).xp)
  check(await xp() === 0, 'wrong quiz awards no XP')
  await page.getByRole('radio').nth(lesson.quiz.correct).check()
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  check(await xp() === 10, 'correct quiz awards 10 XP')
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click()
  check(await xp() === 10, 'quiz XP awarded once')
  await page.getByRole('button', { name: 'Перейти к практике', exact: false }).click()
  await page.getByRole('button', { name: 'Запустить код', exact: true }).click()
  await page.locator('.python-checks').waitFor()
  check(await page.getByRole('button', { name: 'Завершить урок', exact: false }).count() === 0, 'starter cannot complete lesson')
  await page.getByRole('textbox', { name: 'Код решения' }).fill(lesson.solution)
  await page.getByRole('button', { name: 'Запустить код', exact: true }).click()
  await page.getByRole('button', { name: 'Завершить урок', exact: false }).click()
  check(await xp() === 90, 'real Python solution and quiz complete lesson')
  await page.getByRole('button', { name: 'Запустить код', exact: true }).click()
  await page.locator('.python-checks').waitFor()
  check(await xp() === 90, 'replay awards no duplicate lesson XP')
  await page.locator('.side-nav').getByRole('button', { name: 'Прогресс', exact: true }).click()
  await page.getByText('Сохранено в SQL.', { exact: false }).waitFor()
  check((await page.locator('.progress-metrics').innerText()).includes('1/36'), 'quiz excluded from lesson count')
  const key = await page.evaluate(() => localStorage.getItem('code-arena-profile-key'))
  const restoredContext = await page.context().browser().newContext()
  try {
    await restoredContext.addInitScript(key => localStorage.setItem('code-arena-profile-key', key), key)
    const restored = await restoredContext.newPage()
    await restored.goto('http://127.0.0.1:5175')
    await restored.waitForFunction(() => JSON.parse(localStorage.getItem('code-arena-progress-v1') || '{}').xp === 90)
    check(true, 'SQL recovery in new context with same test profile key')
  } finally { await restoredContext.close() }
  await page.locator('.music-dock summary').click()
  await page.getByRole('button', { name: 'Включить lofi', exact: true }).click()
  await page.getByRole('button', { name: 'Остановить музыку', exact: true }).waitFor()
  await page.getByLabel('Настроение музыки').selectOption('ambient')
  await page.getByRole('button', { name: 'Остановить музыку', exact: true }).click()
  check(await page.getByRole('button', { name: 'Включить lofi', exact: true }).count() === 1, 'music play, mood and stop')
  await page.locator('.music-dock summary').click()
  const worker = await page.evaluate(async () => {
    const { PythonRunner } = await import('/src/lib/pythonRunner.ts')
    const { pythonLessons } = await import('/src/data/pythonCourse.ts')
    const checks = []
    for (const i of [3, 9, 17, 19, 21, 23]) {
      const l = pythonLessons[i], r = await new PythonRunner().run(l.solution, l.checks, l.stdin, () => {})
      checks.push({ id: l.id, pass: !r.error && r.tests.every(t => t.passed) })
    }
    const runner = new PythonRunner()
    let timeout = ''
    try { await runner.run('while True:\n    pass', [], '', () => {}) } catch (e) { timeout = e.message }
    const recovery = await runner.run('print(2 + 2)', [], '', () => {})
    return { checks, timeout, recovery }
  })
  worker.checks.forEach(c => check(c.pass, 'browser worker ' + c.id))
  check(worker.timeout.includes('6 секунд') && worker.recovery.output.trim() === '4', 'infinite loop terminates and runner recovers')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const nav of ['Главная', 'Курсы', 'Python', 'Арена', 'Прогресс', 'Словарь']) {
    await page.locator('.mobile-nav').getByRole('button', { name: nav, exact: true }).click()
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout ' + nav)
  }
  check(report.errors.length === 0, 'no uncaught studio errors')
  return report
}
