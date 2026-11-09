import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Play, RotateCcw, Sparkles } from 'lucide-react'
import { labLevels, labModes, labStyle, blocksToCode, matchingRects } from '../lib/gameLab'
import type { CommandBlock, GameMode, LabLevel } from '../lib/gameLab'
import type { Direction, LanguageId, Point } from '../types'
import { courses } from '../data/courses'
import { validateMission } from '../lib/missionEngine'
import { RobotWorld } from '../components/RobotWorld'
import { useProgress } from '../state/useProgress'
import './game-lab.css'
import { AssistedCodeInput } from '../components/AssistedCodeInput'
import { MechanismWorkshop } from './MechanismWorkshop'

const plants = [
  { kind: 'mint', name: 'Мята', ready: 'yes', icon: '❧' },
  { kind: 'sunflower', name: 'Подсолнух', ready: 'no', icon: '✺', id: 'sun' },
  { kind: 'mint', name: 'Мята', ready: 'no', icon: '❧' },
  { kind: 'lavender', name: 'Лаванда', ready: 'yes', icon: '♧' },
]
const directions: { id: Direction; label: string }[] = [{ id: 'right', label: '→ Вправо' }, { id: 'up', label: '↑ Вверх' }, { id: 'left', label: '← Влево' }, { id: 'down', label: '↓ Вниз' }]
const languages: { id: LanguageId; label: string }[] = [{id:'python',label:'Python'}, {id:'javascript',label:'JavaScript'}, {id:'csharp',label:'C#'}, {id:'go',label:'Go'}]

export function GameLab() {
  const [section,setSection]=useState<'mechanisms'|'classic'>('mechanisms')
  return <><nav className="workshop-switch" aria-label="Разделы мастерской"><button type="button" aria-pressed={section==='mechanisms'} onClick={()=>setSection('mechanisms')}>Python · Мастерская механизмов</button><button type="button" aria-pressed={section==='classic'} onClick={()=>setSection('classic')}>Другие мастерские</button></nav>{section==='mechanisms'?<MechanismWorkshop/>:<ClassicGameLab/>}</>
}

function ClassicGameLab() {
  const { progress } = useProgress()
  const [mode, setMode] = useState<GameMode>('flex')
  const [index, setIndex] = useState(0)
  const levels = labLevels.filter(l => l.mode === mode)
  const done = labLevels.filter(l => progress.completed.includes(l.id)).length
  function changeMode(next: GameMode) {
    setMode(next)
    const first = labLevels.filter(l => l.mode === next).findIndex(l => !progress.completed.includes(l.id))
    setIndex(first < 0 ? 0 : first)
  }
  return <div className="game-lab">
    <header className="lab-heading"><div><span className="section-kicker">МАСТЕРСКАЯ ТИХОЙ БУХТЫ</span><h1>Поиграй. Пойми. Напиши.</h1><p>Код двигает лодки, поливает сад и помогает Искре найти дорогу.</p></div><span className="lab-total"><Sparkles size={20}/>{done} / {labLevels.length}<small>открытий сделано</small></span></header>
    <nav className="lab-modes" aria-label="Игровые мастерские">{labModes.map(m => <button type="button" key={m.id} aria-pressed={mode === m.id} onClick={() => changeMode(m.id)}><span aria-hidden="true">{m.symbol}</span><strong>{m.title}<small>{m.skill}</small></strong><span className="lab-mode-count">{labLevels.filter(l => l.mode === m.id && progress.completed.includes(l.id)).length}/4</span></button>)}</nav>
    <nav className="lab-levels" aria-label="Уровни мастерской">{levels.map((l, i) => <button key={l.id} type="button" aria-current={index === i ? 'step' : undefined} onClick={() => setIndex(i)}><span>{progress.completed.includes(l.id) ? <Check size={16}/> : i + 1}</span>{l.title}</button>)}</nav>
    <LabMission key={levels[index].id} level={levels[index]} number={index + 1} onNext={() => index < levels.length - 1 ? setIndex(index + 1) : changeMode(labModes[(labModes.findIndex(m => m.id === mode) + 1) % labModes.length].id)} last={index === levels.length - 1}/>
  </div>
}

function LabMission({level, number, onNext, last}: {level: LabLevel; number: number; onNext: () => void; last: boolean}) {
  const { progress, completeMission, saveDraft } = useProgress()
  const stored = progress.drafts[level.id]
  const initial = (() => {
    try { const v = JSON.parse(stored || '{}'); return { language: languages.some(l => l.id === v.language) ? v.language as LanguageId : 'python' as LanguageId, source: typeof v.source === 'string' ? v.source : '', blocks: Array.isArray(v.blocks) ? v.blocks.filter((b: CommandBlock) => directions.some(d => d.id === b.direction) && Number.isInteger(b.count) && b.count >= 1 && b.count <= 4).slice(0,12) as CommandBlock[] : [], text: v.text === true } } catch { return {language:'python' as LanguageId, source: '', blocks: [] as CommandBlock[], text:false} }
  })()
  const draftRef=useRef(initial);draftRef.current=initial
  const updateDraft=(patch:Partial<typeof initial>)=>{draftRef.current={...draftRef.current,...patch};saveDraft(level.id,JSON.stringify(draftRef.current))}
  const language=initial.language,blocks=initial.blocks,textMode=initial.text
  const source=level.mode==='robot'?initial.source:stored||''
  const setLanguage=(value:LanguageId)=>updateDraft({language:value})
  const setBlocks=(value:CommandBlock[])=>updateDraft({blocks:value})
  const setTextMode=(value:boolean)=>updateDraft({text:value})
  const setSource=(value:string)=>level.mode==='robot'?updateDraft({source:value}):saveDraft(level.id,value)
  const [message, setMessage] = useState('')
  const [won, setWon] = useState(false)
  const [hint, setHint] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [path, setPath] = useState<Point[]>([level.start || {x:0,y:2}])
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pendingWin, setPendingWin] = useState(false)
  const board = useRef<HTMLDivElement>(null)
  const code = level.mode === 'robot' && !textMode ? blocksToCode(blocks, language) : source
  const parsed = level.mode === 'flex' || level.mode === 'grid' ? labStyle(code, level.mode) : null
  const completed = progress.completed.includes(level.id)
  const succeed = () => {
    const fresh = completeMission(level.id, level.xp)
    setWon(true); setMessage(fresh ? `Получилось! +${level.xp} XP. ${level.mode === 'robot' ? 'Искра доставила кристалл.' : 'Твой код изменил мир.'}` : 'Получилось! Этот уровень уже пройден — можно двигаться дальше.')
  }
  useEffect(() => {
    if (!playing) return
    const reduced = !progress.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      if (step < path.length - 1) setStep(reduced ? path.length - 1 : step + 1)
      else { setPlaying(false); if (pendingWin) succeed() }
    }, reduced ? 0 : 420)
    return () => window.clearTimeout(timer)
    // Completion happens only after the route animation reaches its last point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step, path, pendingWin, progress.motion])
  function changed() { setWon(false); setMessage(''); setSelected([]); setPlaying(false); setPendingWin(false); setStep(0); setPath([level.start || {x:0,y:2}]) }
  function run() {
    setWon(false)
    if (level.mode === 'robot') {
      const base = courses.find(c => c.id === language)!
      const result = validateMission({...base, mission:{...base.mission, start:level.start, goal:level.goal, expectedSteps:level.steps, requireLoop:level.loop}}, code)
      setMessage(result.ok ? 'Искра выполняет программу…' : result.message + (result.tests.some(t => !t.passed) ? ' Проверь: ' + result.tests.filter(t => !t.passed).map(t => t.label).join('; ') + '.' : ''))
      setPath(result.positions.length ? result.positions.filter(p => p.x >= 0 && p.x < 3 && p.y >= 0 && p.y < 3) : [level.start!])
      setStep(0); setPendingWin(result.ok); setPlaying(result.positions.length > 1)
      return
    }
    if (!code.trim()) { setMessage('Добавь код. Начни с объяснения над редактором или открой подсказку.'); return }
    if (parsed?.error) { setMessage(parsed.error); return }
    if (level.mode === 'select') {
      try {
        const all = Array.from(board.current!.querySelectorAll('.plant'))
        const matches = Array.from(board.current!.querySelectorAll(code))
        const chosen = all.flatMap((el, i) => matches.includes(el) ? [i] : [])
        setSelected(chosen)
        if (chosen.length === level.selected!.length && chosen.every(i => level.selected!.includes(i))) succeed()
        else setMessage(`Выбрано ${chosen.length} из ${level.selected!.length} нужных растений. Сравни номера на горшочках с заданием.`)
      } catch { setMessage('Селектор не распознан. Проверь точки, #, квадратные скобки и кавычки.') }
      return
    }
    const actual = Array.from(board.current!.querySelectorAll('[data-actual]'))
    const target = Array.from(board.current!.querySelectorAll('[data-target]'))
    if (matchingRects(actual, target)) succeed()
    else setMessage('Пока не совпало. Сравни положение объектов с пунктирными целями: код уже применён к сцене.')
  }
  function updateBlocks(next: CommandBlock[]) { changed(); setBlocks(next); setTextMode(false) }
  return <section className={`lab-mission lab-${level.mode} ${won ? 'lab-won' : ''} ${progress.motion ? '' : 'lab-still'}`}>
    <div className="lab-workbench">
      <div className="lab-brief"><span className="section-kicker">ОТКРЫТИЕ {number} / 4 · {level.xp} XP {completed ? '· ПРОЙДЕНО' : ''}</span><h2>{level.title}</h2><p>{level.brief}</p><div className="lab-theory">{level.theory}</div></div>
      {level.mode === 'robot' && <>
        <label className="lab-language">Запись команд <select aria-label="Язык робота" disabled={textMode} value={language} onChange={e => {changed(); setLanguage(e.target.value as LanguageId); setTextMode(false)}}>{languages.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
        <div className="lab-editor-tabs"><button type="button" aria-pressed={!textMode} onClick={() => {changed(); setTextMode(false)}}>Собрать блоки</button><button type="button" aria-pressed={textMode} onClick={() => {changed(); setSource(code); setTextMode(true)}}>Написать код</button></div>
        {!textMode && <div className="lab-blocks"><div className="lab-block-palette">{directions.map(d => <button disabled={blocks.length >= 12} type="button" key={d.id} onClick={() => updateBlocks([...blocks,{direction:d.id,count:1}])}>{d.label}</button>)}</div><ol>{blocks.map((b,i) => <li key={i}><strong>{directions.find(d => d.id === b.direction)!.label}</strong><select aria-label={`Повторить команду ${i+1}`} value={b.count} onChange={e => updateBlocks(blocks.map((v,j) => j === i ? {...v,count:Number(e.target.value)} : v))}>{[1,2,3,4].map(n => <option key={n} value={n}>×{n}</option>)}</select><button type="button" aria-label={`Поднять команду ${i+1}`} disabled={i===0} onClick={() => {const next=[...blocks]; [next[i-1],next[i]]=[next[i],next[i-1]]; updateBlocks(next)}}>↑</button><button type="button" aria-label={`Удалить команду ${i+1}`} onClick={() => updateBlocks(blocks.filter((_,j) => j!==i))}>×</button></li>)}</ol>{!blocks.length && <p>Нажми на стрелки сверху — собери маршрут.</p>}</div>}
      </>}
      <div className="lab-code"><label htmlFor="lab-code">{level.mode === 'robot' ? `${language} · учебный API hero` : level.mode === 'select' ? 'CSS-селектор' : level.mode === 'flex' ? '.harbor { display: flex; … }' : '.water { … }'}</label><AssistedCodeInput autoGrow key={language + textMode} id="lab-code" label="Код мастерской" value={code} language={level.mode === 'robot' ? language : 'css'} mode={level.mode === 'select' ? 'selector' : level.mode} readOnly={level.mode === 'robot' && !textMode} maxLength={8000} placeholder={level.mode === 'select' ? 'Например: .plant' : level.mode === 'robot' ? 'Здесь появится программа' : '/* Напиши свойства здесь */'} onChange={next => {changed(); setSource(next)}} onRun={() => {if (!playing) run()}}/><div className="lab-run-row"><button type="button" className="button primary" disabled={playing} onClick={run}><Play size={17}/>{playing ? 'Выполняется…' : 'Запустить код'}</button><button type="button" className="icon-button" aria-label="Очистить решение" onClick={() => {changed();setSource('');setBlocks([])}}><RotateCcw size={18}/></button></div></div>
      {level.mode === 'robot' && <p className="lab-api-note">Для смены языка вернись к блокам. Это тренажёр команд движения и циклов for, а не полный компилятор. В блоках создаётся тот же код, который можно изменить во вкладке «Написать код».</p>}
      <button className="lab-hint-toggle" type="button" aria-expanded={hint} onClick={() => setHint(!hint)}>✧ {hint ? 'Скрыть подсказку' : 'Нужна подсказка?'}</button>{hint && <p className="lab-hint">{level.hint}</p>}
    </div>
    <div className="lab-play-area">
      <div className="lab-mobile-goal"><span>ОТКРЫТИЕ {number} / 4</span><h2>{level.title}</h2><p>{level.brief}</p></div>
      <div className="lab-scene-title"><span>{labModes.find(m => m.id === level.mode)!.title}</span><small>{level.mode === 'robot' ? '3D · пошаговое выполнение' : 'Живой результат твоего кода'}</small></div>
      <div ref={board} className={`lab-board ${level.mode}-board`} aria-label="Игровое поле">
        {level.mode === 'flex' && <><div className="lab-shore"><span>ТИХАЯ БУХТА</span><i/><i/><i/></div><div className="harbor-frame"><div className="harbor-layer harbor-target" style={level.target}>{Array.from({length:level.count!},(_,i) => <div key={i} data-target className="boat-target">{i+1}</div>)}</div><div className="harbor-layer" style={parsed?.style}>{Array.from({length:level.count!},(_,i) => <div key={i} data-actual className={`lab-boat boat-${i}`}><i/><b/><span>{i+1}</span></div>)}</div></div><div className="lab-board-caption">Пунктир — место стоянки · цифры — номера лодок</div></>}
        {level.mode === 'grid' && <><div className="garden-label">САД ДОЖДЯ <span>4 столбца × 3 строки</span></div><div className="garden-frame"><div className="garden-cells">{Array.from({length:12},(_,i) => <div key={i}><span>{i%4+1}:{Math.floor(i/4)+1}</span><i>❧</i></div>)}</div><div className="garden-layer"><div className="garden-target" data-target style={level.target}>ЦЕЛЬ</div></div><div className="garden-layer"><div className="garden-water" data-actual style={parsed?.style}>≈</div></div></div><div className="lab-board-caption">Пунктир — грядка · голубая область — твой полив</div></>}
        {level.mode === 'select' && <><div className="greenhouse-roof" aria-hidden="true"/><div className="plant-shelf">{plants.map((p,i) => <div className={`plant ${p.kind} ${selected.includes(i) ? 'picked' : ''}`} id={p.id} data-ready={p.ready} key={i}><span className="plant-leaves" aria-hidden="true">{p.icon}</span><span className="plant-pot">{i+1}</span><strong>{p.name}</strong><small>{p.ready==='yes'?'✓ готово':'растёт'}</small></div>)}</div><div className="lab-board-caption">Нужны горшочки: {level.selected!.map(i=>i+1).join(', ')} · выбрано: {selected.map(i=>i+1).join(', ') || 'пока ничего'}</div></>}
        {level.mode === 'robot' && <><RobotWorld position={path[step] || level.start!} goal={level.goal!} path={path.slice(0,step+1)} color="#f4bf67"/><div className="lab-board-caption">Искра: { (path[step] || level.start!).x+1}:{(path[step] || level.start!).y+1} → цель: {level.goal!.x+1}:{level.goal!.y+1} · шаг {step} / {Math.max(0,path.length-1)}</div></>}
      </div>
      {level.mode === 'select' && <details className="lab-dom" open><summary>Посмотри, как устроен HTML</summary><pre>{plants.map(p => `<div class="plant ${p.kind}"${p.id ? ` id="${p.id}"` : ''} data-ready="${p.ready}">${p.name}</div>`).join('\n')}</pre></details>}
      <div className={`lab-feedback ${won ? 'success' : ''}`} role="status" aria-live="polite">{won && <Check size={22}/>}<p>{message || (completed ? 'Ты уже проходил этот уровень. Можно повторить или выбрать следующий сверху.' : 'Прочитай задание, попробуй решение и посмотри, что изменится.')}</p></div>
      {won && <button type="button" className="button primary lab-next" onClick={onNext}>{last ? 'В следующую мастерскую' : 'Следующее открытие'}<ArrowRight size={18}/></button>}
    </div>
  </section>
}
