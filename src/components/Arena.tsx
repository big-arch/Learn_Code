import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronRight, Circle, Code2, FlaskConical, Lightbulb, LockKeyhole, Sparkles, Target, Trophy } from 'lucide-react'
import { courses, getCourse } from '../data/courses'
import { getLessons, lessonNotes } from '../data/lessons'
import { validateMission } from '../lib/missionEngine'
import { useProgress } from '../state/useProgress'
import type { LanguageId, ValidationResult } from '../types'
import { CodeEditor } from './CodeEditor'
import { MissionPreview } from './MissionPreview'

const fileNames: Record<LanguageId, string> = {
  python: 'mission.py', csharp: 'Mission.cs', go: 'mission.go', javascript: 'mission.js', html: 'index.html', css: 'styles.css',
}

interface ArenaProps {
  courseId: LanguageId
  onCourseChange: (id: LanguageId) => void
  onNotify: (message: string) => void
}

function playSuccessTone() {
  try {
    const AudioContextClass = window.AudioContext
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.18)
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.28)
    oscillator.addEventListener('ended', () => void context.close())
  } catch {
    return
  }
}

export function Arena(props: ArenaProps) {
  const { progress } = useProgress()
  const [lessonIndex, setLessonIndex] = useState(() => Math.max(0, getLessons(getCourse(props.courseId)).findIndex(m => !progress.completed.includes(m.id))))
  return <ArenaLesson key={props.courseId + lessonIndex} {...props} lessonIndex={lessonIndex} onLessonChange={setLessonIndex} />
}

function ArenaLesson({ courseId, onCourseChange, onNotify, lessonIndex, onLessonChange }: ArenaProps & { lessonIndex: number; onLessonChange: (index: number) => void }) {
  const baseCourse = getCourse(courseId)
  const { progress, completeMission, saveDraft } = useProgress()
  const lessons = getLessons(baseCourse)
  const course = { ...baseCourse, mission: lessons[lessonIndex] ?? lessons[0] }
  const notes = lessonNotes(course)
  const code = progress.drafts[course.mission.id] ?? course.mission.starterCode
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const completed = progress.completed.includes(course.mission.id)


  useEffect(() => {
    if (!playing || !result) return
    if (step >= result.positions.length - 1) return
    const timer = window.setTimeout(() => setStep(s => s + 1), 850)
    return () => window.clearTimeout(timer)
  }, [playing, result, step])

  const changeCode = (value: string) => {
    setResult(null)
    setStep(0)
    setPlaying(false)
    saveDraft(course.mission.id, value)
  }

  const runCode = () => {
    const validation = validateMission(course, code)
    setResult(validation)
    const animate = progress.motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setStep(animate ? 0 : Math.max(0, validation.positions.length - 1))
    setPlaying(animate && validation.positions.length > 1)
    if (validation.ok) {
      const firstCompletion = completeMission(course.mission.id, course.mission.xp)
      if (progress.sound) playSuccessTone()
      onNotify(firstCompletion ? `+${course.mission.xp} XP · ${course.mission.title} пройдена!` : 'Маршрут снова пройден. XP уже начислены ранее.')
    }
  }

  const nextCourse = courses[(courses.findIndex((item) => item.id === course.id) + 1) % courses.length]

  return (
    <div className="arena-view view-enter">
      <div className="view-heading arena-heading">
        <div><span className="section-kicker">ЛАБОРАТОРИЯ КОДА · {course.name.toUpperCase()}</span><h1>Напиши. Запусти. Пойми<span>.</span></h1><p>Одна небольшая задача. Понятное объяснение. Результат, который ты создал сам.</p></div>
        <div className="free-stamp"><LockKeyhole size={16} /><span>PAYWALL</span><strong>НЕ НАЙДЕН</strong></div>
      </div>

      <div className="lesson-tabs" aria-label="Уроки направления">
        {lessons.map((lesson, index) => <button type="button" key={lesson.id} aria-pressed={index === lessonIndex} className={index === lessonIndex ? 'active' : ''} onClick={() => onLessonChange(index)}><span>0{index + 1}</span>{lesson.title}{progress.completed.includes(lesson.id) && <Check size={16} />}</button>)}
      </div>
      <details className="lesson-guide panel" open>
        <summary><Lightbulb size={19} />Сначала разберёмся: {notes.title}</summary>
        <div className="guide-body"><div><code>{notes.example}</code><p>{notes.transfer}</p></div><ol>{notes.parts.map(part => <li key={part}>{part}</li>)}</ol></div>
      </details>

      <div className="language-switcher" aria-label="Выбор языка миссии">
        {courses.map((item) => (
          <button key={item.id} type="button" className={item.id === course.id ? 'active' : ''} onClick={() => onCourseChange(item.id)} aria-pressed={item.id === course.id} style={{ '--course-color': item.color } as React.CSSProperties}>
            <i />{item.name}
            {progress.completed.includes(item.mission.id) && <Check size={14} aria-label="Пройдено" />}
          </button>
        ))}
      </div>

      <section className="arena-grid" aria-labelledby="mission-title">
        <div className="mission-brief panel">
          <div className="mission-number">{course.mission.eyebrow}</div>
          <h2 id="mission-title">{course.mission.title}</h2>
          <p>{course.mission.briefing}</p>
          <div className="objective-box"><Target size={19} aria-hidden="true" /><div><strong>Твоя цель</strong><p>{course.mission.objective}</p></div></div>
          <div className="mission-reward"><Trophy size={17} aria-hidden="true" /><span>Награда</span><b>+{course.mission.xp} XP</b></div>
        </div>

        <div className="preview-with-trace"><MissionPreview course={course} code={code} result={result} step={step} />
          {course.mission.kind === 'robot' && <div className="trace-panel">
            <div className="trace-controls"><button type="button" disabled={!result?.positions.length} onClick={() => { setPlaying(false); setStep(0) }}>К началу</button><button type="button" disabled={!result || step >= result.positions.length - 1} onClick={() => { setPlaying(false); setStep(s => s + 1) }}>Следующий шаг →</button><span>Шаг {step} / {Math.max(0, (result?.positions.length ?? 1) - 1)}</span></div>
            <p aria-live="polite">{step && result ? `Строка ${result.lines?.[step - 1]} → ${({ right: 'шаг вправо', left: 'шаг влево', up: 'шаг вверх', down: 'шаг вниз' })[result.commands[step - 1]]}. Робот: (${result.positions[step].x + 1}, ${result.positions[step].y + 1}).` : 'Запусти код, затем разбери маршрут по одной команде.'}</p>
          </div>}
        </div>

        <div className="arena-editor">
          <CodeEditor assistMode={course.mission.kind === 'robot' ? 'robot' : 'general'} value={code} fileName={fileNames[course.id]} activeLine={step ? result?.lines?.[step - 1] : undefined} onChange={changeCode} onRun={runCode} onReset={() => changeCode(course.mission.starterCode)} />
        </div>

        <aside className="mission-console panel">
          <div className="console-title"><FlaskConical size={17} aria-hidden="true" /><h3>Контрольные точки</h3></div>
          <div className="test-list" aria-live="polite">
            {(result?.tests ?? [
              { label: 'Код готов к запуску', passed: false },
              { label: 'Мир отреагирует на решение', passed: false },
              { label: 'Цель будет достигнута', passed: false },
            ]).map((test, index) => (
              <div key={`${test.label}-${index}`} className={test.passed ? 'passed' : ''}>
                {test.passed ? <Check size={15} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}<span>{test.label}</span>
              </div>
            ))}
          </div>
          {result && <div className={`validation-message ${result.ok ? 'success' : 'error'}`} role="status"><Code2 size={17} /><p>{result.message}</p></div>}
          {result?.ok && (
            <div className="completion-card">
              <Sparkles size={24} aria-hidden="true" />
              <div><strong>{completed ? 'Миссия завершена' : 'Отличный запуск'}</strong><span>{completed ? 'Результат сохранён локально' : 'Проверка пройдена'}</span></div>
            </div>
          )}
          <button className="hint-button" type="button" onClick={() => setHintIndex((current) => Math.min(current + 1, course.mission.hint.length - 1))} disabled={hintIndex >= course.mission.hint.length - 1}>
            <Lightbulb size={17} aria-hidden="true" />{hintIndex < 0 ? 'Нужна подсказка?' : 'Ещё подсказка'}<ChevronRight size={15} />
          </button>
          {hintIndex >= 0 && <div className="hint-content"><span>ПОДСКАЗКА {hintIndex + 1}/3</span><p>{course.mission.hint[hintIndex]}</p></div>}
          {result?.ok && <button className="next-mission" type="button" onClick={() => lessonIndex < lessons.length - 1 ? onLessonChange(lessonIndex + 1) : onCourseChange(nextCourse.id)}>{lessonIndex < lessons.length - 1 ? 'Следующий урок: ' + lessons[lessonIndex + 1].title : 'Следующий мир: ' + nextCourse.name}<ArrowRight size={16} /></button>}
        </aside>
      </section>
      <p className="simulation-note">Python, C#, Go и JavaScript работают в безопасной учебной симуляции команд. HTML и CSS обновляют изолированный live preview.</p>
    </div>
  )
}
