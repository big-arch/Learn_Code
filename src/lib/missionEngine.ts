import type { Course, Direction, Point, TestResult, ValidationResult } from '../types'

const deltas: Record<Direction, Point> = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } }
const failure = (message: string, tests: TestResult[] = []): ValidationResult => ({ ok: false, message, commands: [], positions: [], lines: [], tests })

function validateRobot(course: Course, source: string): ValidationResult {
  const python = course.id === 'python'
  const method = course.id === 'csharp' ? 'Hero\\.Move' : course.id === 'go' ? 'hero\\.Move' : 'hero\\.move'
  const quote = python || course.id === 'javascript' ? '["\']' : '"'
  const ending = course.id === 'csharp' ? ';' : ';?'
  const command = new RegExp('^' + method + '\\(\\s*(' + quote + ')(right|left|up|down)\\1\\s*\\)' + ending + '$')
  const rows = source.split('\n').map((raw, i) => ({ raw: raw.replace(python ? /#.*$/ : /\/\/.*$/, '').trimEnd(), line: i + 1 })).filter(r => r.raw.trim())
  const commands: Direction[] = []
  const lines: number[] = []
  let usedLoop = false
  const add = (raw: string, line: number) => {
    const match = raw.trim().match(command)
    if (!match) throw new Error('Строка ' + line + ': не понимаю команду. Проверь имя метода, парные кавычки и скобки' + (course.id === 'csharp' ? ', а также точку с запятой.' : '.'))
    commands.push(match[2] as Direction); lines.push(line)
    if (commands.length > 24) throw new Error('Не больше 24 движений за запуск. Уменьши число повторений.')
  }
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row.raw.trim().startsWith('for ')) {
        if (/^\s/.test(row.raw)) throw new Error('Цикл должен начинаться без отступа. Вложенные циклы в этом уроке не поддерживаются.')
        const pattern = python ? /^for\s+\w+\s+in\s+range\((\d+)\):$/
          : course.id === 'go' ? /^for i := 0; i < (\d+); i\+\+ \{$/
          : new RegExp('^for \\((' + (course.id === 'csharp' ? 'int' : 'let') + ') i = 0; i < (\\d+); i\\+\\+\\) \\{$')
        const match = row.raw.trim().match(pattern)
        if (!match) throw new Error('Строка ' + row.line + ': проверь цикл по образцу урока. Поддерживается цикл с числом повторений.')
        const count = Number(match[python || course.id === 'go' ? 1 : 2])
        if (count < 1 || count > 12) throw new Error('Используй от 1 до 12 повторений.')
        const body: typeof rows = []
        while (i + 1 < rows.length && (python ? /^ {4}\S/.test(rows[i + 1].raw) : rows[i + 1].raw.trim() !== '}')) body.push(rows[++i])
        if (!python && rows[++i]?.raw.trim() !== '}') throw new Error('В конце цикла нужна закрывающая фигурная скобка }.')
        if (!body.length) throw new Error('В цикле нет команд. В Python добавь четыре пробела перед командами внутри цикла.')
        for (let repeat = 0; repeat < count; repeat++) for (const entry of body) add(entry.raw, entry.line)
        usedLoop = true
      } else {
        if (python && /^\s/.test(row.raw)) throw new Error('Строка ' + row.line + ': лишний отступ. Отступ нужен только внутри цикла.')
        add(row.raw, row.line)
      }
    }
  } catch (error) { return failure((error as Error).message, [{ label: 'Синтаксис команд', passed: false }]) }
  if (!commands.length) return failure('Добавь первую команду. Компьютер пока не получил инструкций.')
  const positions = [{ ...(course.mission.start ?? { x: 0, y: 2 }) }]
  let inside = true
  for (const direction of commands) {
    const current = positions.at(-1)!
    const next = { x: current.x + deltas[direction].x, y: current.y + deltas[direction].y }
    positions.push(next)
    if (next.x < 0 || next.x > 2 || next.y < 0 || next.y > 2) { inside = false; break }
  }
  const final = positions.at(-1)!
  const tests = [
    { label: 'Синтаксис команд', passed: true },
    { label: 'Робот остаётся на поле', passed: inside },
    { label: 'Кристалл достигнут', passed: inside && final.x === course.mission.goal?.x && final.y === course.mission.goal?.y },
    { label: 'Ровно четыре движения', passed: commands.length === (course.mission.expectedSteps ?? 4) },
    ...(course.mission.requireLoop ? [{ label: 'Использован цикл', passed: usedLoop }] : []),
  ]
  const ok = tests.every(t => t.passed)
  return { ok, commands, positions, lines, tests, message: ok ? 'Получилось! Четыре движения привели робота к кристаллу.' : !inside ? 'Команда ' + (positions.length - 1) + ', строка ' + lines[positions.length - 2] + ': робот вышел за край. Координаты поля — от 1 до 3.' : 'Почти! Посмотри на непрошедшие контрольные точки и измени решение.' }
}

// Use the same CSS parser in the preview and validation; comments aren't styles.
export function readPondStyle(source: string) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(source)
  const style = document.createElement('div').style
  for (const rule of sheet.cssRules) {
    if (rule instanceof CSSStyleRule && rule.selectorText === '#pond') {
      for (const prop of Array.from(rule.style)) {
        const priority = rule.style.getPropertyPriority(prop)
        if (style.getPropertyPriority(prop) !== 'important' || priority === 'important') style.setProperty(prop, rule.style.getPropertyValue(prop), priority)
      }
    }
  }
  return { display: style.display, justifyContent: style.justifyContent }
}

export function validateMission(course: Course, code: string): ValidationResult {
  if (code.length > 20000) return failure('Код слишком длинный. В учебной миссии доступно 20 000 символов.')
  if (course.mission.kind === 'robot') return validateRobot(course, code)
  let tests: TestResult[]
  if (course.mission.kind === 'html') {
    const doc = new DOMParser().parseFromString(code, 'text/html')
    const main = doc.querySelector('main')
    const link = main?.querySelector('a')
    tests = [{ label: 'Есть элемент main', passed: Boolean(main) }, ...(course.mission.variant === 'link' ? [
      { label: 'Текст ссылки «Изучать HTML»', passed: link?.textContent?.trim() === 'Изучать HTML' },
      { label: 'Адрес ведёт в справочник HTML', passed: link?.getAttribute('href') === 'https://developer.mozilla.org/ru/docs/Web/HTML' },
    ] : [
      { label: 'Заголовок «КОД:АРЕНА»', passed: main?.querySelector('h1')?.textContent?.trim() === 'КОД:АРЕНА' },
      { label: 'Кнопка «Запустить»', passed: main?.querySelector('button')?.textContent?.trim() === 'Запустить' },
    ])]
  } else {
    const style = readPondStyle(code)
    const target = course.mission.variant === 'center' ? 'center' : 'flex-end'
    tests = [{ label: 'Для #pond включён display: flex', passed: style.display === 'flex' }, { label: 'Выравнивание: ' + target, passed: style.justifyContent === target }]
  }
  const ok = tests.every(t => t.passed)
  return { ok, tests, commands: [], positions: [], message: ok ? 'Получилось! Все условия выполнены. Посмотри, как твой код изменил страницу.' : 'Проверь отмеченные условия. Комментарий объясняет код, но сам ничего не выполняет.' }
}
