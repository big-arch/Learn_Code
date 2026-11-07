import { useEffect, useRef } from 'react'
import { ArrowRight, Clock3, FolderGit2, Play, X } from 'lucide-react'
import type { Course } from '../types'

interface CourseDialogProps {
  course: Course | null
  onClose: () => void
  onStart: () => void
}

export function CourseDialog({ course, onClose, onStart }: CourseDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (course && !dialog.open) dialog.showModal()
    if (!course && dialog.open) dialog.close()
  }, [course])

  return (
    <dialog ref={ref} className="course-dialog" aria-labelledby="course-dialog-title" onClose={onClose}>
      {course && (
        <>
          <div className="course-dialog-hero" style={{ '--course-color': course.color } as React.CSSProperties}>
            <div className="dialog-topline">
              <span>{course.name.toUpperCase()} // LEARNING PATH</span>
              <form method="dialog"><button className="icon-button" aria-label="Закрыть программу курса"><X size={19} /></button></form>
            </div>
            <span className="course-dialog-index">0{course.modules.length} МОДУЛЯ · 0₽</span>
            <h2 id="course-dialog-title">{course.tagline}</h2>
            <p>{course.description}</p>
            <div className="course-meta"><span><Clock3 size={15} />{course.duration}</span><span><FolderGit2 size={15} />{course.project}</span></div>
          </div>
          <div className="course-dialog-body">
            <h3>План развития курса</h3>
            <ol className="module-list">
              {course.modules.map((module, index) => (
                <li key={module.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><h4>{module.title}</h4><p>{module.description}</p><small>{module.lessons} учебных шагов</small></div>
                  {index === 0 ? <Play size={18} aria-label="Доступно сейчас" /> : <span className="soft-chip">В планах</span>}
                </li>
              ))}
            </ol>
            <div className="dialog-mission-card">
              <div><span>ПЕРВАЯ ИГРОВАЯ МИССИЯ</span><h3>{course.mission.title}</h3><p>{course.mission.objective}</p></div>
              <button className="button primary" type="button" onClick={onStart}>Начать миссию<ArrowRight size={17} /></button>
            </div>
            <p className="prototype-note">Сейчас доступны 2 вводные миссии. Модули выше — план развития, а не готовый полный курс.</p>
          </div>
        </>
      )}
    </dialog>
  )
}
