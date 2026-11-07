import { ArrowRight, Check, Code2, Gem, Lock, MapPin, Play, Route, Sparkles } from 'lucide-react'
import { completedWorlds, getLessons, nextCourseFor } from '../data/lessons'
import { courses } from '../data/courses'
import { useProgress } from '../state/useProgress'
import type { LanguageId } from '../types'

const positions = [
  { x: 17, y: 20 }, { x: 69, y: 13 }, { x: 77, y: 56 },
  { x: 49, y: 78 }, { x: 12, y: 72 }, { x: 43, y: 35 },
]

export function MapView({ onStartMission }: { onStartMission: (id: LanguageId) => void }) {
  const { progress } = useProgress()
  const nextBase = nextCourseFor(progress.completed)
  const nextCourse = { ...nextBase, mission: getLessons(nextBase).find(m => !progress.completed.includes(m.id)) ?? nextBase.mission }

  return (
    <div className="map-view view-enter">
      <div className="view-heading"><div><span className="section-kicker">КАРТА ЗНАНИЙ // СВЯЗИ НАВЫКОВ</span><h1>Ты уже дальше,<br />чем кажется<span>.</span></h1><p>Каждый язык — не изолированный курс, а новый способ видеть систему целиком.</p></div><div className="map-legend"><span><i className="done" />Старт пройден</span><span><i className="current" />Доступно</span><span><i />Впереди</span></div></div>

      <div className="map-layout">
        <section className="knowledge-map" aria-label="Интерактивная карта языков">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M17 20 L43 35 L69 13 M43 35 L77 56 L49 78 L12 72 L17 20 M43 35 L49 78 M17 20 L12 72 M69 13 L77 56" />
            <path className="map-path-active" d="M17 20 L43 35 L49 78" />
          </svg>
          <div className="map-core"><Code2 size={28} /><span>ТВОЙ<br />ПОТЕНЦИАЛ</span></div>
          {courses.map((course, index) => {
            const done = getLessons(course).every(m => progress.completed.includes(m.id))
            const current = course.id === nextCourse.id
            return (
              <button
                type="button"
                key={course.id}
                className={`map-node ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                style={{ '--x': `${positions[index].x}%`, '--y': `${positions[index].y}%`, '--course-color': course.color } as React.CSSProperties}
                onClick={() => onStartMission(course.id)}
                aria-label={`${course.name}: ${done ? 'миссия пройдена' : 'миссия доступна'}`}
              >
                <span className="node-index">0{index + 1}</span>
                <span className="node-icon">{done ? <Check size={22} /> : current ? <MapPin size={22} /> : <Gem size={21} />}</span>
                <strong>{course.name}</strong><small>{course.skills[0]}</small>
                <span className="node-status">{done ? 'СТАРТ ПРОЙДЕН' : current ? 'ТЫ ЗДЕСЬ' : 'ИССЛЕДОВАТЬ'}</span>
              </button>
            )
          })}
          <div className="map-coordinates">SECTOR 06<br />48.12 / 07.64</div>
        </section>

        <aside className="map-sidebar panel">
          <span className="section-kicker">СЛЕДУЮЩАЯ ТОЧКА</span>
          <div className="map-next-icon"><Route size={28} /></div>
          <h2>{nextCourse.mission.title}</h2><p>{nextCourse.mission.briefing}</p>
          <div className="map-next-meta"><span>{nextCourse.name}</span><span>+{nextCourse.mission.xp} XP</span></div>
          <button className="button primary" type="button" onClick={() => onStartMission(nextCourse.id)}><Play size={17} fill="currentColor" />Отправиться<ArrowRight size={17} /></button>
          <div className="map-principle"><Sparkles size={18} /><p><strong>Нет тупиков.</strong> Любой мир доступен сразу. Маршрут подсказывает, но не ограничивает.</p></div>
          <div className="map-completion"><span>Исследовано карты</span><strong>{Math.round(completedWorlds(progress.completed) / 6 * 100)}%</strong><div><i style={{ width: `${completedWorlds(progress.completed) / 6 * 100}%` }} /></div></div>
          <p className="map-lock-note"><Lock size={13} />Никаких платных зон на карте.</p>
        </aside>
      </div>
    </div>
  )
}
