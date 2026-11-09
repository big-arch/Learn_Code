import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft, Code2, Download, Flag, Lightbulb, Mail, Play, RotateCcw, Square, Trophy } from 'lucide-react'
import { practiceKinds, practiceLessons, practiceTracks, previewDocument, webCriteria, webDraft, checkWeb } from '../lib/practice'
import type { PracticeLesson, PracticeTrack } from '../lib/practice'
import { PythonRunner } from '../lib/pythonRunner'
import type { PythonResult } from '../lib/pythonRunner'
import { pythonHelp } from '../lib/mechanisms'
import { AssistedCodeInput } from '../components/AssistedCodeInput'
import { ParcelTrace } from '../components/ParcelTrace'
import { useProgress } from '../state/useProgress'
import type { TestResult } from '../types'
import './practice.css'

export function LearningPaths({ onOpen }: { onOpen: (track: PracticeTrack) => void }) {
  const { progress } = useProgress()
  return <section className="learning-paths" aria-label="Практические маршруты"><header><span className="section-kicker">УЧИСЬ ЧЕРЕЗ ПРОЕКТ</span><h2>Один остров. Два настоящих результата.</h2><p>Короткий урок, самостоятельная попытка, понятная проверка. В конце у тебя останется собственная программа или страница.</p></header>{practiceTracks.map((track, i) => {
    const lessons = practiceLessons.filter(l => l.track === track.id), done = lessons.filter(l => progress.completed.includes(l.id)).length
    return <article className="learning-path" key={track.id}><div className="path-number">0{i + 1}<small>{track.language}</small></div><div><h3>{track.title}</h3><p>{track.description}</p><div className="path-skills">{track.skills.map(s => <span key={s}>{s}</span>)}</div><small>{lessons.length} заданий · 1 итоговый проект · {done}/{lessons.length} выполнено</small></div><button className="button primary" type="button" onClick={() => onOpen(track.id)}>{done ? 'Продолжить' : 'Начать маршрут'}<ArrowRight size={17}/></button></article>
  })}</section>
}

export function PracticeView({ startTrack = 'python', onPython }: { startTrack?: PracticeTrack; onPython: (chapter: number) => void }) {
  const { progress } = useProgress()
  const [track, setTrack] = useState<PracticeTrack>(startTrack)
  const lessons = practiceLessons.filter(l => l.track === track)
  const first = (t: PracticeTrack) => practiceLessons.find(l => l.track === t && !progress.completed.includes(l.id))?.id ?? practiceLessons.find(l => l.track === t)!.id
  const [selected, setSelected] = useState(() => first(startTrack))
  const lesson = lessons.find(l => l.id === selected) ?? lessons[0], index = lessons.indexOf(lesson)
  const done = lessons.filter(l => progress.completed.includes(l.id)).length
  const current = practiceTracks.find(t => t.id === track)!
  function select(id: string) { setSelected(id); document.getElementById('practice-workspace')?.scrollIntoView({ block: 'start' }) }
  return <div className="practice-course">
    <header className="practice-heading"><div><span className="section-kicker">ПРАКТИКУМ / ТИХАЯ БУХТА</span><h1>Учись. Пробуй. Создавай.</h1><p>Каждая задача приближает к работающему проекту.</p></div><Mail size={56} strokeWidth={1.2}/></header>
    <div className="practice-track-switch" role="group" aria-label="Выбор практикума">{practiceTracks.map(t => <button key={t.id} type="button" aria-pressed={track === t.id} onClick={() => { setTrack(t.id); setSelected(first(t.id)) }}><span>{t.language}</span>{t.title}</button>)}</div>
    <div className="practice-route-heading"><div><h2>{current.result}</h2><p>6–12 минут на задание · без таймера · можно вернуться к любой теме</p></div><span>{done} / {lessons.length}<small>заданий выполнено</small></span></div>
    <nav className="practice-route" aria-label="Маршрут практикума">{lessons.map((l, i) => <button type="button" key={l.id} aria-current={l.id === lesson.id ? 'step' : undefined} onClick={() => select(l.id)}><span>{progress.completed.includes(l.id) ? <Check size={17}/> : i === lessons.length - 1 ? <Flag size={17}/> : String(i + 1).padStart(2, '0')}</span><strong>{l.skill}</strong><small>{practiceKinds[l.kind]}</small></button>)}</nav>
    <PracticeLessonView key={lesson.id} lesson={lesson} index={index} total={lessons.length} allDone={done === lessons.length} onNext={() => select(lessons[Math.min(index + 1, lessons.length - 1)].id)} onPrevious={() => select(lessons[Math.max(0, index - 1)].id)} onPython={onPython}/>
  </div>
}

function PracticeLessonView({ lesson, index, total, allDone, onNext, onPrevious, onPython }: { lesson: PracticeLesson; index: number; total: number; allDone: boolean; onNext: () => void; onPrevious: () => void; onPython: (chapter: number) => void }) {
  const { progress, saveDraft, completeMission, storageStatus } = useProgress()
  const isPython = lesson.track === 'python'
  const raw = progress.drafts[lesson.id], code = raw ?? lesson.starter
  const web = useMemo(() => webDraft(raw, lesson), [raw, lesson])
  const [file, setFile] = useState<'html' | 'css'>(lesson.css ? 'css' : 'html')
  const [tests, setTests] = useState<TestResult[] | null>(null), [result, setResult] = useState<PythonResult | null>(null)
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [failure, setFailure] = useState(''), [hint, setHint] = useState(0)
  const [demo, setDemo] = useState(false), [source, setSource] = useState(''), [runId, setRunId] = useState(0)
  const [comparison, setComparison] = useState<'mine' | 'target' | 'both'>('mine')
  const [preview, setPreview] = useState(web), [loadedHtml, setLoadedHtml] = useState(''), [hovered, setHovered] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null), runner = useRef(new PythonRunner()), request = useRef({ id: 0, busy: false }), previous = useRef(raw)
  const html = useMemo(() => isPython ? '' : previewDocument(preview.html, preview.css, progress.motion), [preview, isPython, progress.motion])
  const target = useMemo(() => isPython ? '' : previewDocument(lesson.solutionHtml, lesson.solutionCss, progress.motion), [lesson, isPython, progress.motion])
  const pending = !isPython && (preview.html !== web.html || preview.css !== web.css || loadedHtml !== html)
  useEffect(() => { const current = runner.current, ticket = request.current; return () => { ticket.id++; current.stop() } }, [])
  useEffect(() => {
    if (raw !== previous.current) { previous.current = raw; request.current.id++; request.current.busy = false; runner.current.stop(); setBusy(false); setTests(null); setResult(null); setFailure(''); setDemo(false); setHovered(false) }
  }, [raw])
  useEffect(() => { if (isPython) return; const timer = setTimeout(() => setPreview(web), 250); return () => clearTimeout(timer) }, [web, isPython])
  function change(value: string) {
    request.current.id++; request.current.busy = false; runner.current.stop(); setBusy(false); setTests(null); setResult(null); setFailure(''); setDemo(false)
    saveDraft(lesson.id, isPython ? value : JSON.stringify({ ...web, [file]: value }))
  }
  function accept(checks: TestResult[]) { setTests(checks); if (checks.length && checks.every(t => t.passed)) completeMission(lesson.id, lesson.xp) }
  async function run(example = false) {
    if (request.current.busy) return
    if (!isPython) {
      if (pending || !frame.current?.contentDocument) return
      const id = ++request.current.id
      setComparison('mine')
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (id === request.current.id && frame.current?.contentDocument) accept(checkWeb(frame.current.contentDocument, lesson.webChecks))
      return
    }
    const id = ++request.current.id, submitted = example ? lesson.example : code
    request.current.busy = true; setBusy(true); setStatus('Подготовка Python…'); setFailure(''); setTests(null); setResult(null); setDemo(example); setSource(submitted)
    try {
      const answer = await runner.current.run(submitted, example ? [] : lesson.checks, '', s => { if (id === request.current.id) setStatus(s) })
      if (id !== request.current.id) return
      setResult(answer); setRunId(n => n + 1); setFailure(answer.error)
      if (!example) { if (answer.error) setTests(answer.tests); else accept(answer.tests) }
    } catch (e) { if (id === request.current.id) setFailure((e as Error).message) }
    finally { if (id === request.current.id) { request.current.busy = false; setBusy(false) } }
  }
  function reset() { change(isPython ? lesson.starter : (file === 'html' ? lesson.html : lesson.css)) }
  function download() {
    const content = isPython ? code : previewDocument(web.html, web.css, progress.motion)
    const url = URL.createObjectURL(new Blob([content], { type: isPython ? 'text/x-python;charset=utf-8' : 'text/html;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = isPython ? 'island-post.py' : 'island-post.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const passed = Boolean(tests?.length && tests.every(t => t.passed) && !failure)
  const criteria = isPython ? lesson.checks.map(c => c.label) : lesson.webChecks.map(c => webCriteria[c])
  const lines = code.split('\n')
  const swap = (i: number, delta: number) => { const next = [...lines]; [next[i], next[i + delta]] = [next[i + delta], next[i]]; change(next.join('\n')) }
  return <>
    <div id="practice-workspace" className="practice-workspace">
      <aside className="practice-brief"><button type="button" className="practice-mobile-jump" onClick={() => document.getElementById('practice-editor')?.scrollIntoView({block:'start'})}>К редактору ↓</button>
        <span className="practice-kind">{practiceKinds[lesson.kind]} · {lesson.minutes} минут</span><h2>{lesson.title}</h2><p>{lesson.brief}</p>
        <details className="practice-theory" open><summary><BookOpen size={17}/> Разобраться</summary>{lesson.theory.map(t => <p key={t}>{t}</p>)}{isPython && <><pre>{lesson.example}</pre><small>Результат: {lesson.exampleOutput}</small><button type="button" className="button secondary" disabled={busy} onClick={() => void run(true)}><Play size={15}/>Запустить пример</button></>}</details>
        <div className="practice-assignment"><span>ТВОЯ ЗАДАЧА</span><p>{lesson.task}</p></div>
        <div className="practice-criteria"><strong>Критерии готовности</strong><ul>{criteria.map((c, i) => <li key={c} data-passed={tests?.[i]?.passed ? 'yes' : 'no'}><span aria-hidden="true">{tests?.[i]?.passed ? '✓' : '○'}</span>{c}</li>)}</ul></div>
        <button type="button" className="practice-hint-button" disabled={hint >= lesson.hints.length} onClick={() => setHint(n => n + 1)}><Lightbulb size={17}/>Подсказка {hint}/{lesson.hints.length}</button>{hint > 0 && <p className="practice-hint" role="status">{lesson.hints[hint - 1]}</p>}
        {isPython && <button className="practice-back-course" type="button" onClick={() => onPython(lesson.chapter)}>Повторить тему в курсе Python <ArrowRight size={15}/></button>}
      </aside>
      <div className="practice-editor-column" id="practice-editor"><button type="button" className="practice-mobile-jump" onClick={() => document.getElementById('practice-workspace')?.scrollIntoView({block:'start'})}>Вернуться к заданию ↑</button>
        {lesson.kind === 'order' && <div className="practice-order-lines"><strong>Собери порядок строк</strong>{lines.map((line, i) => <div key={i}><code>{line || 'Пустая строка'}</code><button type="button" aria-label={`Строка ${i + 1} вверх`} disabled={i === 0} onClick={() => swap(i, -1)}><ArrowUp size={16}/></button><button type="button" aria-label={`Строка ${i + 1} вниз`} disabled={i === lines.length - 1} onClick={() => swap(i, 1)}><ArrowDown size={16}/></button></div>)}</div>}
        <div className="practice-editor"><header>{isPython ? <span><Code2 size={16}/> station.py</span> : <div className="practice-file-tabs" role="group" aria-label="Файл проекта">{(['html', 'css'] as const).map(f => <button key={f} type="button" aria-pressed={file === f} onClick={() => setFile(f)}>{f === 'html' ? 'index.html' : 'style.css'}</button>)}</div>}<button type="button" aria-label="Вернуть заготовку текущего файла" onClick={reset}><RotateCcw size={17}/></button></header>
          <AssistedCodeInput key={isPython ? 'python' : file} language={isPython ? 'python' : file} value={isPython ? code : web[file]} onChange={change} onRun={() => void run()} label={isPython ? 'Код практикума Python' : `Код практикума ${file.toUpperCase()}`} autoGrow maxLength={isPython ? 20000 : 8000}/>
          <footer><small>{isPython ? 'Ctrl + Enter' : 'Живой предпросмотр'}</small>{busy ? <button type="button" className="button secondary" onClick={() => runner.current.stop()}><Square size={16}/>Остановить</button> : <button type="button" className="button primary" disabled={pending} onClick={() => void run()}><Play size={16}/>{isPython ? 'Запустить и проверить' : 'Проверить страницу'}</button>}</footer>
        </div>
        <p className="practice-run-status" role="status">{busy ? status : demo ? 'Учебный пример. Твой код сохранён; XP не начисляется.' : pending ? 'Применяем изменения…' : isPython ? 'Исполняется настоящий Python. Ошибки можно исправлять без штрафа.' : 'Результат обновляется после ввода. Проверка сравнит структуру и оформление.'}</p>
        {failure && <div className="practice-error" role="alert"><strong>{pythonHelp(failure)}</strong><pre>{failure}</pre></div>}
        {isPython && result && <div className="practice-console"><span>ВЫВОД ПРОГРАММЫ</span><pre>{result.output || 'Пока ничего не напечатано'}</pre><small>Ожидается в задании:</small><pre>{lesson.expected}</pre></div>}
        {tests && <div className={`practice-verdict ${passed ? 'success' : ''}`} role="status"><strong>{passed ? 'Получилось. Задача выполнена!' : 'Есть что поправить'}</strong><p>{passed ? `${lesson.xp} XP за первое прохождение. ${index === total - 1 ? 'Сохрани свой проект кнопкой ниже.' : 'Можно перейти к следующему шагу.'}` : 'Посмотри на незакрытые критерии слева. Измени решение и проверь ещё раз.'}</p>{passed && index < total - 1 && <button type="button" className="button primary" onClick={onNext}>Следующий шаг <ArrowRight size={17}/></button>}</div>}
        <button type="button" className="practice-mobile-jump" onClick={() => document.getElementById('practice-result')?.scrollIntoView({block:'start'})}>Посмотреть результат ↓</button>
        <button type="button" className="practice-download" onClick={download}><Download size={16}/>{isPython ? 'Скачать программу .py' : 'Скачать страницу .html'}</button>
      </div>
      <div className="practice-result-column" id="practice-result">
        {isPython ? <ParcelTrace key={runId} result={result} source={source} motion={progress.motion}/> : <section className="practice-web-preview"><header><strong>Страница в браузере</strong><div role="group" aria-label="Режим предпросмотра">{([{ id: 'mine', title: 'Твой результат' }, { id: 'target', title: 'Образец' }, { id: 'both', title: 'Сравнить' }] as const).map(v => <button type="button" key={v.id} aria-pressed={comparison === v.id} onClick={() => setComparison(v.id)}>{v.title}</button>)}</div></header><div className={comparison === 'both' ? 'practice-preview-pair' : ''}><div hidden={comparison === 'target'}><small>Твой результат</small><iframe ref={frame} title="Твой сайт почты" sandbox="allow-same-origin" srcDoc={html} onLoad={() => { setLoadedHtml(html); setHovered(false) }}/></div><div hidden={comparison === 'mine'}><small>Образец</small><iframe title="Образец сайта почты" sandbox="allow-same-origin" srcDoc={target}/></div></div>{lesson.webChecks.some(c => c === 'lift') && <button className="practice-hover" type="button" aria-pressed={hovered} onClick={() => { frame.current?.contentDocument?.querySelector('.postcard')?.classList.toggle('preview-hover', !hovered); setHovered(!hovered); setComparison('mine') }}>{hovered ? 'Убрать наведение' : 'Показать наведение'}</button>}<p className="practice-note">Сравни расположение и смысл элементов. Можно написать другой код, если результат отвечает критериям.</p></section>}
      </div>
    </div>
    {allDone && <div className="practice-complete"><Trophy size={30}/><div><h2>Маршрут пройден. Проект у тебя.</h2><p>Ты можешь повторить задания, изменить данные и развить свой проект.</p></div></div>}
    <footer className="practice-navigation"><button type="button" disabled={index === 0} onClick={onPrevious}><ChevronLeft size={17}/>Назад</button><span>{storageStatus}</span><button type="button" disabled={index === total - 1} onClick={onNext}>Следующее задание<ArrowRight size={17}/></button></footer>
  </>
}
