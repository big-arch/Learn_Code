import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, Clock3, Play, Search, SlidersHorizontal, X } from 'lucide-react'
import { courses } from '../data/courses'
import { useProgress } from '../state/useProgress'
import type { Course, LanguageId } from '../types'

interface CoursesViewProps {
  onOpenCourse: (course: Course) => void
  onStartMission: (id: LanguageId) => void
}

type LevelFilter = 'all' | 'Новичок' | 'Базовый'

export function CoursesView({ onOpenCourse, onStartMission }: CoursesViewProps) {
  const { progress } = useProgress()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [language, setLanguage] = useState<LanguageId | 'all'>('all')

  const filtered = useMemo(() => courses.filter((course) => {
    const matchesQuery = `${course.name} ${course.tagline} ${course.description} ${course.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())
    return matchesQuery && (level === 'all' || course.level === level) && (language === 'all' || course.id === language)
  }), [query, level, language])

  const clearFilters = () => { setQuery(''); setLevel('all'); setLanguage('all') }

  return (
    <div className="courses-view view-enter">
      <div className="view-heading"><div><span className="section-kicker">КАТАЛОГ // 6 НАПРАВЛЕНИЙ</span><h1>Твоя траектория<span>.</span></h1><p>Начни с Python: 24 урока от первой строки до проекта. Ещё пять направлений можно попробовать в коротких игровых миссиях.</p></div><div className="catalog-price"><span>ВСЕ КУРСЫ</span><strong>0 ₽</strong><small>без пробного периода</small></div></div>

      <div className="catalog-controls">
        <label className="catalog-search"><Search size={18} aria-hidden="true" /><span className="visually-hidden">Поиск курсов</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Язык, навык или проект" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={16} /></button>}</label>
        <div className="level-filters" aria-label="Фильтр по уровню"><SlidersHorizontal size={17} aria-hidden="true" />{(['all', 'Новичок', 'Базовый'] as const).map((item) => <button type="button" key={item} className={level === item ? 'active' : ''} onClick={() => setLevel(item)} aria-pressed={level === item}>{item === 'all' ? 'Все уровни' : item}</button>)}</div>
      </div>
      <div className="language-filters" aria-label="Фильтр по языку"><button type="button" className={language === 'all' ? 'active' : ''} onClick={() => setLanguage('all')}>Все языки <span>6</span></button>{courses.map((course) => <button type="button" key={course.id} className={language === course.id ? 'active' : ''} onClick={() => setLanguage(course.id)}>{course.name}</button>)}</div>

      <div className="catalog-summary"><span>Найдено: <strong>{filtered.length}</strong></span><i />Сортировка: от первой строки к проекту</div>

      {filtered.length > 0 ? <div className="catalog-grid">{filtered.map((course, index) => {
        const done = progress.completed.includes(course.id === 'python' ? 'python-v2-24' : course.mission.id)
        return (
          <article className="catalog-card" key={course.id} style={{ '--course-color': course.color } as React.CSSProperties}>
            <div className="catalog-card-visual">
              <span className="catalog-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="catalog-language">{course.name === 'C#' ? 'C#' : course.name.slice(0, 3).toUpperCase()}</span>
              <div className="catalog-orbit"><i /><i /><i /></div>
              <span className="catalog-level">{course.level}</span>
            </div>
            <div className="catalog-card-content">
              <div className="catalog-title"><div><h2>{course.name}</h2><p>{course.tagline}</p></div>{done && <span className="completed-chip"><Check size={13} />СТАРТ ПРОЙДЕН</span>}</div>
              <p className="catalog-description">{course.description}</p>
              <div className="skill-pills">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <div className="catalog-facts"><span><BookOpen size={15} />{course.id === 'python' ? '24 урока доступны' : '2 миссии доступны'}</span><span><Clock3 size={15} />{course.id === 'python' ? '4–6 часов' : '10–15 минут'}</span></div>
              <div className="project-line"><span>ПРОЕКТ</span><strong>{course.project}</strong></div>
              <div className="catalog-card-actions"><button className="button secondary" type="button" onClick={() => onOpenCourse(course)}>Программа</button><button className="button primary" type="button" onClick={() => onStartMission(course.id)}><Play size={16} fill="currentColor" />{done ? 'Играть снова' : 'Начать'}<ArrowRight size={16} /></button></div>
            </div>
          </article>
        )
      })}</div> : <div className="catalog-empty"><Search size={36} /><h2>Такого маршрута пока нет</h2><p>Попробуй изменить запрос или сбросить фильтры.</p><button className="button primary" type="button" onClick={clearFilters}>Сбросить фильтры</button></div>}
    </div>
  )
}
