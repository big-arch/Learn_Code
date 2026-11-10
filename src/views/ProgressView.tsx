import { useEffect, useRef } from 'react'
import { BookOpen, Award, BarChart3, Check, Code2, Flame, Gamepad2, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { allMissions, getLessons, completedWorlds, nextCourseFor } from '../data/lessons'
import { islandQuests } from '../data/adventure'
import { pythonLessons } from '../data/pythonCourse'
import classicLabLevels from '../data/game-lab.json'
import mechanisms from '../data/mechanism-missions.json'
import practiceLessons from '../data/practice-lessons.json'
import { courses } from '../data/courses'
import { useProgress } from '../state/useProgress'
import { useAccount } from '../state/useAccount'
import type { LanguageId } from '../types'

const labLevels = [...classicLabLevels, ...mechanisms]
const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

export function ProgressView({ onStartMission, onGames, onPractice }: { onStartMission: (id: LanguageId) => void; onGames: () => void; onPractice: () => void }) {
  const { progress, cloud, storageStatus, setSound, setMotion, resetProgress } = useProgress()
  const {configured,setOpen}=useAccount()
  const resetRef = useRef<HTMLDialogElement>(null)
  const level = Math.floor(progress.xp / 500) + 1
  const levelXp = progress.xp % 500
  const pythonDone = pythonLessons.filter(l => progress.completed.includes(l.id)).length
  const lessonsDone = progress.completed.filter(id => !id.endsWith('-quiz')).length
  const total = progress.activity.reduce((sum, value) => sum + value, 0)
  const maxActivity = Math.max(...progress.activity, 1)

  useEffect(() => () => { if (resetRef.current?.open) resetRef.current.close() }, [])

  const badges = [
    { title: 'Первый контакт', description: 'Запустил рабочий код', icon: Zap, unlocked: lessonsDone >= 1 },
    { title: 'Исследователь', description: 'Прошёл миссии в 3 мирах', icon: Gamepad2, unlocked: completedWorlds(progress.completed) >= 3 },
    { title: 'Полиглот', description: 'Прошёл вводные миссии 6 направлений', icon: Code2, unlocked: completedWorlds(progress.completed) >= 6 },
    { title: 'В своём ритме', description: 'Семь учебных дней подряд', icon: Flame, unlocked: progress.streak >= 7 },
  ]

  return (
    <div className="progress-view view-enter">
      <div className="view-heading"><div><span className="section-kicker">ЛИЧНАЯ ТЕЛЕМЕТРИЯ</span><h1>Прогресс, который видно<span>.</span></h1><p>Здесь нет сравнения с другими. Только твой код, твои решения и твой собственный темп.</p></div><button className="button secondary" type="button" onClick={() => onStartMission(nextCourseFor(progress.completed).id)}><Play size={16} />Новая миссия</button></div>

      {configured&&<section className="progress-sync"><div><h2>{cloud?'Прогресс связан с облаком':'Продолжай на другом устройстве'}</h2><p>{cloud?storageStatus:'Подключи личный код или почту, чтобы перенести уроки, игры и черновики.'}</p></div><button type="button" className="button secondary" onClick={()=>setOpen(true)}>{cloud?'Управлять синхронизацией':'Подключить устройства'}</button></section>}
      <section className="progress-hero panel">
        <div className="level-emblem"><span>УРОВЕНЬ</span><strong>{String(level).padStart(2, '0')}</strong><div className="level-orbit"><i /><i /></div></div>
        <div className="level-details"><span className="section-kicker">РАЗРАБОТЧИК · {level < 3 ? 'НАЧАЛО ПУТИ' : 'УВЕРЕННЫЙ СТАРТ'}</span><h2>{progress.xp} <span>XP</span></h2><p>{levelXp} из 500 XP до уровня {String(level + 1).padStart(2, '0')}</p><div className="level-progress"><i style={{ width: `${levelXp / 5}%` }} /></div></div>
        <div className="progress-metrics"><div><Gamepad2 size={20} /><strong>{lessonsDone}<span>/{allMissions.length + pythonLessons.length + islandQuests.length + labLevels.length + practiceLessons.length}</span></strong><small>уроков и миссий</small></div><div><Flame size={20} /><strong>{progress.streak}</strong><small>дней в серии</small></div><div><BarChart3 size={20} /><strong>{total}</strong><small>за неделю</small></div></div>
      </section>

      <section className="adventure-banner"><BookOpen size={28}/><div><h2>Практикумы: {practiceLessons.filter(l => progress.completed.includes(l.id)).length} / {practiceLessons.length}</h2><p>Почтовый диспетчер на Python и сайт станции на HTML/CSS. Два маршрута от упражнения до проекта.</p></div><button className="button primary" type="button" onClick={onPractice}>Продолжить практикум</button></section>
      <div className="progress-layout">
        <section className="activity-panel panel">
          <div className="panel-heading"><div><span className="section-kicker">АКТИВНОСТЬ · 7 ДНЕЙ</span><h2>Твой ритм</h2></div><span className="soft-chip">{total} шагов</span></div>
          <div className="progress-bar-chart">{progress.activity.map((value, index) => <div key={weekDays[index]}><span>{value}</span><div><i style={{ height: `${Math.max(3, value / maxActivity * 100)}%` }} /></div><small>{weekDays[index]}</small></div>)}</div>
          <p className="gentle-note"><Sparkles size={15} />График показывает завершённые уроки, вопросы и миссии.</p>
        </section>

        <section className="settings-panel panel">
          <div className="panel-heading"><div><span className="section-kicker">КОМФОРТ</span><h2>Настройки</h2></div><Settings2 size={22} /></div>
          <button className="setting-row" type="button" onClick={() => setSound(!progress.sound)} aria-pressed={progress.sound}><span>{progress.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</span><div><strong>Звуковой отклик</strong><small>Короткий сигнал после победы</small></div><i className={`toggle ${progress.sound ? 'on' : ''}`}><b /></i></button>
          <button className="setting-row" type="button" onClick={() => setMotion(!progress.motion)} aria-pressed={progress.motion}><span>{progress.motion ? <Play size={19} /> : <Pause size={19} />}</span><div><strong>3D-движение</strong><small>Можно остановить в любой момент</small></div><i className={`toggle ${progress.motion ? 'on' : ''}`}><b /></i></button>
          <div className="local-data-note"><ShieldCheck size={19} /><p>{storageStatus}. {cloud ? 'Прогресс связан с аккаунтом и синхронизируется между устройствами. При потере сети изменения остаются на этом устройстве.' : import.meta.env.MODE === 'pages' ? 'Прогресс хранится только в этом браузере. На другом устройстве начнётся отдельное прохождение.' : 'Черновики и прогресс сохраняются в браузере и локальной SQL-базе, когда сервер доступен.'}</p></div>
          <button className="reset-button" type="button" onClick={() => resetRef.current?.showModal()}><RotateCcw size={15} />Сбросить прогресс</button>
        </section>
      </div>

      <section className="adventure-banner"><Sparkles size={30}/><div><h2>Игровая мастерская: {labLevels.filter(l => progress.completed.includes(l.id)).length} / {labLevels.length}</h2><p>Механизмы Python, бухта, сад, теплица и маршруты Искры. Эти открытия учитываются отдельно от вводных миссий по направлениям ниже.</p></div><button type="button" className="button primary" onClick={onGames}>Вернуться в мастерскую</button></section>

      <section className="skills-panel panel">
        <div className="panel-heading"><div><span className="section-kicker">ПРОГРЕСС ОБУЧЕНИЯ</span><h2>Навыки по направлениям</h2></div><span className="soft-chip">По реальным действиям</span></div>
        <div className="mastery-grid">{courses.map((course) => {
          const doneCount = course.id === 'python' ? pythonDone : getLessons(course).filter(m => progress.completed.includes(m.id)).length
          const done = doneCount === (course.id === 'python' ? 24 : getLessons(course).length)
          const hasDraft = Boolean(progress.drafts[course.mission.id] && progress.drafts[course.mission.id] !== course.mission.starterCode)
          const percent = Math.round(doneCount / (course.id === 'python' ? 24 : 2) * 100)
          return <button type="button" key={course.id} onClick={() => onStartMission(course.id)} style={{ '--course-color': course.color } as React.CSSProperties}><div><strong>{course.name}</strong><span>{percent}%</span></div><p>{course.id === 'python' ? `${pythonDone} из 24 уроков` : done ? course.mission.title : hasDraft ? 'Черновик сохранён' : 'Первая миссия ждёт'}</p><div className="mastery-track"><i style={{ width: `${percent}%` }} /></div><small>{done ? <><Check size={12} />Маршрут пройден</> : course.skills.join(' · ')}</small></button>
        })}</div>
      </section>

      <section className="badges-section"><div className="section-heading"><div><span className="section-kicker">КОЛЛЕКЦИЯ ДОСТИЖЕНИЙ</span><h2>Следы побед</h2></div><span>{badges.filter((badge) => badge.unlocked).length} / {badges.length}</span></div><div className="badges-grid">{badges.map((badge, index) => {
        const Icon = badge.icon
        return <article key={badge.title} className={`badge-card ${badge.unlocked ? 'unlocked' : ''}`}><div className="badge-icon">{badge.unlocked ? <Icon size={28} /> : <Trophy size={27} />}<span>0{index + 1}</span></div><div><h3>{badge.title}</h3><p>{badge.description}</p><span>{badge.unlocked ? <><Check size={12} />ПОЛУЧЕНО</> : 'ЕЩЁ ВПЕРЕДИ'}</span></div></article>
      })}</div></section>

      <dialog ref={resetRef} className="confirm-dialog" aria-labelledby="reset-title">
        <div className="dialog-topline"><span>ЛОКАЛЬНЫЕ ДАННЫЕ</span><form method="dialog"><button className="icon-button" aria-label="Отменить сброс"><X size={18} /></button></form></div>
        <Award size={34} /><h2 id="reset-title">Начать с чистого листа?</h2><p>{cloud ? 'Прогресс аккаунта будет сброшен в облаке и на подключённых устройствах. Локальная копия до сброса останется в аккаунте для скачивания.' : 'XP, черновики, миссии и достижения будут сброшены в гостевом профиле и при следующем сохранении в SQL.'}</p>
        <div className="confirm-actions"><form method="dialog"><button className="button secondary" autoFocus>Оставить прогресс</button></form><button className="button danger" type="button" onClick={() => { resetProgress(); resetRef.current?.close() }}>Да, сбросить</button></div>
      </dialog>
    </div>
  )
}
