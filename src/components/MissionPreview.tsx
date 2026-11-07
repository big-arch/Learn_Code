import { Leaf, Radio } from 'lucide-react'
import { RobotWorld } from './RobotWorld'
import { readPondStyle } from '../lib/missionEngine'
import type { CSSProperties } from 'react'
import type { Course, ValidationResult } from '../types'

interface MissionPreviewProps {
  course: Course
  code: string
  result: ValidationResult | null
  step?: number
}

export function MissionPreview({ course, code, result, step = 0 }: MissionPreviewProps) {
  const { mission } = course
  const style = { '--course-color': course.color } as CSSProperties

  if (mission.kind === 'html') {
    return (
      <div className="mission-preview html-preview" style={style}>
        <div className="preview-chrome"><span /><span /><span /><b>LIVE PREVIEW</b></div>
        <iframe
          title="Предпросмотр HTML-задания"
          sandbox=""
          srcDoc={`<!doctype html><html lang="ru"><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111716;color:#eaf0e8;font-family:system-ui}main{text-align:center;padding:32px}a{color:#d7ff64}h1{font-size:clamp(24px,5vw,42px);letter-spacing:-1px}button{margin-top:16px;padding:14px 24px;border:0;border-radius:4px;background:#d7ff64;color:#111716;font-weight:800;font-size:16px}</style></head><body>${code}</body></html>`}
        />
      </div>
    )
  }

  if (mission.kind === 'css') {
    const pondStyle = readPondStyle(code)
    return (
      <div className="mission-preview css-preview" style={style}>
        <div className="preview-label"><Radio size={14} aria-hidden="true" /> LIVE CSS</div>
        <div className="pond-sky"><i /><i /><i /></div>
        <div className="pond" style={pondStyle}>
          <div className="frog" aria-label="Лягушка"><i /><i /><span /></div>
          <div className="lily" style={mission.variant === 'center' ? { right: 'calc(50% - 17px)' } : undefined}><Leaf size={34} aria-hidden="true" /></div>
        </div>
        <p>Измени свойство — сцена обновится сразу.</p>
      </div>
    )
  }

  const current = result?.positions[step] ?? mission.start ?? { x: 0, y: 2 }
  const path = result?.positions.slice(0, step + 1) ?? []

  return (
    <div className={`mission-preview robot-preview ${result?.ok ? 'is-complete' : ''}`} style={style}>
      <div className="preview-label"><Radio size={14} aria-hidden="true" /> СИМУЛЯЦИЯ МИРА</div>
      <RobotWorld position={current} goal={mission.goal ?? { x: 2, y: 0 }} path={path} color={course.color} />
      <div className="preview-status"><span>СТАРТ 01:03</span><span>ЦЕЛЬ 03:01</span></div>
    </div>
  )
}
