import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, Film, Square } from 'lucide-react'
import data from '../data/python-video.json'
import { useProgress } from '../state/useProgress'
import { PythonRunner } from '../lib/pythonRunner'
import type { PythonResult } from '../lib/pythonRunner'
import { CodeEditor } from './CodeEditor'
import { ProgramStage } from './ProgramStage'

type Lab = typeof data.labs[number]
type VideoReference = { source: string; start: number; label: string }
const references: Record<string, VideoReference[]> = data.references
const timestamp = (seconds: number) => {
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
  return parts[0] ? parts.map((n, i) => i ? String(n).padStart(2, '0') : n).join(':') : parts.slice(1).map((n, i) => i ? String(n).padStart(2, '0') : n).join(':')
}

export function VideoCourseSources({ onSelect }: { onSelect: (index: number) => void }) {
  return <details className="video-course-sources">
    <summary><Film size={20} aria-hidden="true" /><span>Два видеокурса рядом с практикой <small>{data.labs.length} дополнительных тренировок по разобранным темам</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="video-source-grid">{data.sources.map(source => <article key={source.id}>
      <span>{source.author}</span><h3>{source.title}</h3><p>{source.status}</p>
      <a href={source.url} target="_blank" rel="noreferrer">Открыть курс на YouTube <ArrowUpRight size={17} aria-hidden="true" /></a>
    </article>)}</div>
    <nav className="video-practice-index" aria-label="Дополнительные тренировки">{data.labs.map(lab => <button type="button" key={lab.id} onClick={() => onSelect(Number(lab.lessonId.slice(-2)) - 1)}><span>Урок {Number(lab.lessonId.slice(-2))}</span>{lab.title}<ArrowUpRight size={16} aria-hidden="true" /></button>)}</nav>
  </details>
}

export function VideoLesson({ lessonId }: { lessonId: string }) {
  const refs = references[lessonId]
  const lab = data.labs.find(item => item.lessonId === lessonId)
  const [open, setOpen] = useState(false)
  if (!refs?.length) return null
  return <details className="video-lesson" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><Film size={23} aria-hidden="true" /><span><strong>{lab ? 'Закрепить тему: видео и практика' : 'Посмотреть видео по теме'}</strong><small>{lab?.title ?? 'Объяснения авторов с переходом к нужной главе'}</small></span><ChevronDown size={20} aria-hidden="true" /></summary>
    <div className="video-lesson-content">
      <div className="video-chapters">{refs.map(ref => {
        const source = data.sources.find(item => item.id === ref.source)!
        return <a key={ref.source} href={`https://www.youtube.com/watch?v=${source.videoId}&t=${ref.start}s`} target="_blank" rel="noreferrer"><span><strong>{source.author}</strong><span>{ref.label}</span></span><time>{timestamp(ref.start)}</time><ArrowUpRight size={18} aria-hidden="true" /></a>
      })}</div>
      <p className="video-editorial-note">Таймкоды — из оглавлений и расшифровок. {lab ? `Источник темы: ${data.sources.find(source => source.id === lab.source)?.author}. Объяснения и упражнения ниже написаны для КОД:АРЕНЫ.` : 'Видео открывается на YouTube в новой вкладке.'}</p>
      {lab && open && <VideoLab key={lab.id} lab={lab} />}
    </div>
  </details>
}

function VideoLab({ lab }: { lab: Lab }) {
  const {progress,cloud,saveDraft}=useProgress()
  const cloudKey='video-'+lab.id
  const draftKey = 'code-arena:video-draft:' + lab.id
  const [guestCode, setCode] = useState(() => {
    if(cloud)return lab.starter
    try { const saved = localStorage.getItem(draftKey); return saved !== null && saved.length <= 20000 ? saved : lab.starter } catch { return lab.starter }
  })
  const code=cloud?(progress.drafts[cloudKey]??lab.starter):guestCode
  const [draftWarning, setDraftWarning] = useState('')
  const [result, setResult] = useState<PythonResult | null>(null)
  const [source, setSource] = useState(''), [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('')
  const [activeLine, setActiveLine] = useState<number | undefined>()
  const [runId, setRunId] = useState(0)
  const runner = useRef(new PythonRunner()), token = useRef({ request: 0 }), running = useRef(false)
  useEffect(() => { const current = runner.current, state = token.current; return () => { state.request++; current.stop() } }, [])

  const change = (value: string) => {
    token.current.request++; runner.current.stop(); running.current = false; setBusy(false); setStatus('')
    setCode(value); setResult(null); setError(''); setActiveLine(undefined)
    if(cloud){saveDraft(cloudKey,value);return}
    try { localStorage.setItem(draftKey, value); setDraftWarning('') } catch { setDraftWarning('Не удалось сохранить черновик на устройстве. Скопируй код перед выходом.') }
  }
  const run = async (example = false) => {
    if (running.current) return
    const request = ++token.current.request, submitted = example ? lab.solution : code
    running.current = true; setBusy(true); setError(''); setResult(null); setActiveLine(undefined); setDemo(example); setSource(submitted)
    try {
      const value = await runner.current.run(submitted, example ? [] : lab.checks, '', message => { if (request === token.current.request) setStatus(message) })
      if (request === token.current.request) { setResult(value); setRunId(value => value + 1) }
    } catch (reason) { if (request === token.current.request) setError((reason as Error).message) }
    finally { if (request === token.current.request) { running.current = false; setBusy(false); setStatus('') } }
  }
  const passed = Boolean(!demo && result && !result.error && result.tests.length && result.tests.every(check => check.passed))
  return <section className="video-lab" aria-label={lab.title}>
    <div className="video-lab-copy"><span className="reading-label">ДОПОЛНИТЕЛЬНАЯ ТРЕНИРОВКА</span><h3>{lab.title}</h3><p>{lab.idea}</p>
      <div className="video-pitfall"><strong>На что обратить внимание</strong><p>{lab.pitfall}</p></div>
      <details className="video-prediction"><summary>{lab.question}</summary><p>{lab.answer}</p></details>
      <h4>Попробуй сам</h4><p>{lab.task}</p>
    </div>
    <div className="video-lab-grid">
      <div><CodeEditor value={code} fileName={lab.id + '.py'} onChange={change} onRun={() => void run()} onReset={() => change(lab.starter)} activeLine={activeLine} />
        <p className="video-draft-note">Дополнительная практика без XP. {cloud?'Черновик синхронизируется с аккаунтом.':'Черновик сохраняется на этом устройстве.'}</p>
        {draftWarning && <p role="alert">{draftWarning}</p>}
        <div className="video-run-status" role="status">{busy ? status : passed ? 'Готово! Все проверки пройдены.' : result && !demo ? 'Запуск завершён. Посмотри результат и проверки.' : ''}</div>
        {busy && <button type="button" className="button secondary" onClick={() => runner.current.stop()}><Square size={16} />Остановить Python</button>}
        {(error || result?.error) && <pre className="video-python-error" role="alert">{error || result?.error}</pre>}
        {result && <div className="video-output"><strong>{demo ? 'Вывод учебного примера' : 'Вывод твоего кода'}</strong><pre>{result.output || 'Нет вывода'}</pre></div>}
        {result && !demo && <ul className="video-checks" aria-label="Проверки тренировки">{result.tests.map(check => <li className={check.passed ? 'passed' : 'retry'} key={check.label}>{check.passed ? '✓' : '○'} {check.label}</li>)}</ul>}
      </div>
      <ProgramStage key={runId} result={result} source={source} demo={demo} busy={busy} onDemo={() => void run(true)} onStep={setActiveLine} />
    </div>
    <details className="video-hint"><summary>Нужна подсказка?</summary><p>{lab.hint}</p></details>
    <details className="video-solution"><summary>Разобрать решение</summary><pre><code>{lab.solution}</code></pre><p>{lab.answer}</p></details>
  </section>
}
