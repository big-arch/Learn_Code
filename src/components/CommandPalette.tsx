import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import { courses } from '../data/courses'
import type { LanguageId, ViewId } from '../types'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (view: ViewId) => void
  onStartMission: (id: LanguageId) => void
}

const views: { id: ViewId; label: string }[] = [
  { id: 'practice', label: 'Практикум — проекты Python, HTML и CSS' },
  { id: 'adventure', label: 'Приключение — Остров Тихой бухты' },
  { id: 'home', label: 'Главная' },
  { id: 'courses', label: 'Каталог курсов' },
  { id: 'map', label: 'Карта знаний' },
  { id: 'games', label: 'Игровая мастерская — Flexbox, Grid, селекторы, робот' },
  { id: 'arena', label: 'Игровая арена' },
  { id: 'progress', label: 'Мой прогресс' },
  { id: 'research', label: 'Справочник Python' },
  { id: 'python', label: 'Полный начальный курс Python' },
]

export function CommandPalette({ open, onClose, onNavigate, onStartMission }: CommandPaletteProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const normalized = query.toLowerCase().trim()
  const matchingCourses = courses.filter((course) => `${course.name} ${course.tagline}`.toLowerCase().includes(normalized))
  const matchingViews = views.filter((view) => view.label.toLowerCase().includes(normalized))

  return (
    <dialog ref={ref} className="command-dialog" aria-labelledby="command-title" onClose={onClose}>
      <div className="dialog-topline">
        <span id="command-title">БЫСТРЫЙ ПЕРЕХОД</span>
        <form method="dialog"><button className="icon-button" aria-label="Закрыть поиск"><X size={18} /></button></form>
      </div>
      <label className="command-input">
        <Search size={20} aria-hidden="true" />
        <span className="visually-hidden">Поиск по курсам и разделам</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Python, арена, прогресс..." />
      </label>
      <div className="command-results">
        {matchingViews.length > 0 && <span className="result-caption">РАЗДЕЛЫ</span>}
        {matchingViews.map((view) => (
          <button type="button" key={view.id} onClick={() => { onNavigate(view.id); onClose() }}>
            <span>{view.label}</span><ArrowRight size={16} aria-hidden="true" />
          </button>
        ))}
        {matchingCourses.length > 0 && <span className="result-caption">ЗАПУСТИТЬ МИССИЮ</span>}
        {matchingCourses.map((course) => (
          <button type="button" key={course.id} onClick={() => { onStartMission(course.id); onClose() }}>
            <span><i style={{ background: course.color }} />{course.name}<small>{course.mission.title}</small></span><ArrowRight size={16} aria-hidden="true" />
          </button>
        ))}
        {matchingViews.length === 0 && matchingCourses.length === 0 && <p className="empty-state">Ничего не найдено. Попробуй «Python» или «Арена».</p>}
      </div>
      <div className="command-hint"><kbd>Esc</kbd> закрыть <span>Все маршруты бесплатны</span></div>
    </dialog>
  )
}
