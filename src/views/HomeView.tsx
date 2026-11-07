import { useState } from 'react'
import { ArrowRight, Award, BookOpen, Check, ChevronRight, Circle, Code2, Flame, Gamepad2, Gem, Pause, Play, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { BeginnerPath } from '../components/BeginnerPath'
import { completedWorlds, nextCourseFor, getLessons } from '../data/lessons'
import { LearningIsland } from '../components/LearningIsland'
import { courses } from '../data/courses'
import { useProgress } from '../state/useProgress'
import type { Course, LanguageId, ViewId } from '../types'

interface HomeViewProps {
  onNavigate: (view: ViewId) => void
  onStartMission: (id: LanguageId) => void
  onOpenCourse: (course: Course) => void
  onNotify: (message: string) => void
}

const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

export function HomeView({ onNavigate, onStartMission, onOpenCourse, onNotify }: HomeViewProps) {
  const { progress, setMotion } = useProgress()
  const [crystalFound, setCrystalFound] = useState(false)
  const nextBase = nextCourseFor(progress.completed)
  const nextCourse = { ...nextBase, mission: getLessons(nextBase).find(m => !progress.completed.includes(m.id)) ?? nextBase.mission }
  const completedCount = completedWorlds(progress.completed)
  const weeklyTotal = progress.activity.reduce((sum, value) => sum + value, 0)
  const maxActivity = Math.max(...progress.activity, 1)

  return (
    <div className="home-view view-enter">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><i /> ТВОЯ ПЕРВАЯ СТРОКА КОДА <span>·</span> 0 ₽</div>
          <h1>Не просто учи код.<br /><span>Меняй миры.</span></h1>
          <p className="hero-lead">Освой программирование через игры, живые миссии и проекты. Без подписок, скучных лекций и страха первой строки.</p>
          <div className="hero-actions">
            <button className="button primary hero-primary" type="button" onClick={() => onStartMission(nextCourse.id)}>
              <Play size={18} fill="currentColor" aria-hidden="true" />
              {progress.completed.length ? 'Продолжить миссию' : 'Начать первую миссию'}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="button ghost" type="button" onClick={() => onNavigate('courses')}>Все направления <ChevronRight size={17} /></button>
          </div>
          <div className="hero-proof">
            <span><Check size={14} />6 направлений · 12 миссий</span><span><Check size={14} />Без регистрации</span><span><Check size={14} />Прогресс на устройстве</span>
          </div>
        </div>
        <div className="hero-world">
          <div className="world-topline"><span>СЕКТОР 01 // ОСТРОВ ЗНАНИЙ</span><button className="icon-button" type="button" onClick={() => setMotion(!progress.motion)} aria-label={progress.motion ? 'Остановить 3D-анимацию' : 'Включить 3D-анимацию'} aria-pressed={!progress.motion}>{progress.motion ? <Pause size={16} /> : <Play size={16} />}</button></div>
          <LearningIsland
            paused={!progress.motion}
            completed={completedCount > 0}
            onCrystalClick={() => {
              setCrystalFound(true)
              onNotify('Кристалл знаний найден. Запусти миссию, чтобы активировать его!')
            }}
          />
          <div className={`world-mission ${crystalFound ? 'highlight' : ''}`}>
            <div className="mission-gem"><Gem size={24} aria-hidden="true" /></div>
            <div><span>ТЕКУЩАЯ МИССИЯ</span><strong>{nextCourse.mission.title}</strong><small>{nextCourse.name} · +{nextCourse.mission.xp} XP</small></div>
            <button type="button" onClick={() => onStartMission(nextCourse.id)} aria-label={`Запустить миссию ${nextCourse.mission.title}`}><ArrowRight size={20} /></button>
          </div>
        </div>
      </section>

      <BeginnerPath onStart={onStartMission} />
      <section className="pulse-strip" aria-label="Сводка обучения">
        <div><span className="pulse-index">01</span><Target size={20} /><p>Цель недели<strong>{weeklyTotal} / 3 миссии</strong></p><div className="pulse-line"><i style={{ width: `${Math.min(100, weeklyTotal / 3 * 100)}%` }} /></div></div>
        <div><span className="pulse-index">02</span><Gamepad2 size={20} /><p>Пройдено миров<strong>{completedCount} из 6</strong></p><span className="pulse-tag">{completedCount === 6 ? 'ВСЁ!' : 'В ПРОЦЕССЕ'}</span></div>
        <div><span className="pulse-index">03</span><Zap size={20} /><p>Энергия знаний<strong>{progress.xp} XP</strong></p><span className="pulse-tag lime">УР. {Math.floor(progress.xp / 500) + 1}</span></div>
      </section>

      <section className="home-section tracks-section">
        <div className="section-heading"><div><span className="section-kicker">ВЫБЕРИ СВОЙ ПУТЬ</span><h2>Шесть миров. Одна цель.</h2></div><button className="text-link" type="button" onClick={() => onNavigate('courses')}>Смотреть программы <ArrowRight size={16} /></button></div>
        <div className="track-grid">
          {courses.map((course, index) => {
            const done = progress.completed.includes(course.mission.id)
            return (
              <article className="track-card" key={course.id} style={{ '--course-color': course.color } as React.CSSProperties}>
                <div className="track-top"><span>0{index + 1}</span><i>{course.name === 'C#' ? 'C#' : course.name.slice(0, 2).toUpperCase()}</i>{done && <span className="track-done"><Check size={13} /> ГОТОВО</span>}</div>
                <h3>{course.name}</h3><p className="track-tagline">{course.tagline}</p><p className="track-description">{course.description}</p>
                <div className="skill-pills">{course.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>
                <div className="track-bottom"><button type="button" onClick={() => onOpenCourse(course)}>Программа <BookOpen size={15} /></button><button className="track-play" type="button" onClick={() => onStartMission(course.id)} aria-label={`Играть в миссию ${course.name}`}><Play size={16} fill="currentColor" /></button></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="home-section dashboard-grid">
        <div className="weekly-panel panel">
          <div className="panel-heading"><div><span className="section-kicker">РИТМ НЕДЕЛИ</span><h2>Маленькие шаги. Видимый рост.</h2></div><Flame size={24} /></div>
          <div className="weekly-chart" aria-label={`Активность за неделю: ${weeklyTotal} миссий`}>
            {progress.activity.map((value, index) => <div key={weekDays[index]}><span className="bar-value">{value || ''}</span><div className="bar-track"><i style={{ height: `${Math.max(4, value / maxActivity * 100)}%` }} /></div><span>{weekDays[index]}</span></div>)}
          </div>
          <p className="gentle-note"><Sparkles size={15} />15 минут в день достаточно. Пропуск — не провал: продолжай с того места, где остановился.</p>
        </div>
        <div className="next-panel panel">
          <div className="panel-heading"><div><span className="section-kicker">ДАЛЬШЕ ПО МАРШРУТУ</span><h2>Твоя экспедиция</h2></div></div>
          <ol className="expedition-list">
            {courses.slice(0, 4).map((course, index) => {
              const done = progress.completed.includes(course.mission.id)
              const current = course.id === nextCourse.id
              return <li key={course.id} className={current ? 'current' : ''}><span>{done ? <Check size={15} /> : <Circle size={13} />}</span><div><strong>{course.mission.title}</strong><small>{course.name} · {index === 0 ? 'Синтаксис' : course.skills[0]}</small></div>{current ? <button type="button" onClick={() => onStartMission(course.id)}>Играть</button> : <span className="xp-label">+{course.mission.xp}</span>}</li>
            })}
          </ol>
        </div>
      </section>

      <section className="home-section achievement-preview">
        <div className="achievement-copy"><span className="section-kicker">НЕ РАДИ МЕДАЛЕЙ. НО ПРИЯТНО.</span><h2>Каждое «получилось»<br />остаётся с тобой.</h2><p>Собирай достижения за реальные навыки, а не за время у экрана.</p><button className="text-link" type="button" onClick={() => onNavigate('progress')}>Мой прогресс <ArrowRight size={16} /></button></div>
        <div className="badge-stack">
          <div className={`achievement-badge badge-main ${progress.completed.length ? 'unlocked' : ''}`}><Trophy size={30} /><span>ПЕРВЫЙ ЗАПУСК</span><strong>Мир отвечает</strong><small>{progress.completed.length ? 'Получено' : 'Заверши первую миссию'}</small></div>
          <div className={`achievement-badge badge-side ${completedCount >= 3 ? 'unlocked' : ''}`}><Code2 size={24} /><span>ПОЛИГЛОТ</span><strong>3 языка</strong></div>
          <div className={`achievement-badge badge-side second ${completedCount >= 6 ? 'unlocked' : ''}`}><Award size={24} /><span>АРХИТЕКТОР</span><strong>Все миры</strong></div>
        </div>
      </section>
    </div>
  )
}
