import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Compass, Footprints, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { IslandWorld } from '../adventure/IslandWorld'
import { QuestDialog } from '../adventure/QuestDialog'
import { islandQuests } from '../data/adventure'
import { SPAWN } from '../adventure/world'
import type { Position } from '../adventure/world'
import { useProgress } from '../state/useProgress'

export function AdventureView({onCourse}:{onCourse:()=>void}) {
  const {progress,storageStatus}=useProgress()
  const [position,setPosition]=useState<Position>(SPAWN),[nearby,setNearby]=useState<number|null>(null),[active,setActive]=useState<number|null>(null)
  const [direction,setDirection]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[destination,setDestination]=useState<{index:number;serial:number}|null>(null)
  const [fallback,setFallback]=useState(false),[message,setMessage]=useState('Добро пожаловать! Подойди к Мире у тропинки.')
  useEffect(()=>{if(!matchMedia('(max-width:560px)').matches)return;const frame=requestAnimationFrame(()=>document.querySelector('.adventure-stage')?.scrollIntoView({block:'start',behavior:'instant'}));return()=>cancelAnimationFrame(frame)},[])
  const serial=useRef(0),storyPanel=useRef<HTMLDivElement>(null)
  const [solved,setSolved]=useState<number|null>(null),[event,setEvent]=useState<number|null>(null)
  useEffect(()=>{if(event!==null)storyPanel.current?.focus({preventScroll:true})},[event])
  const visualCompleted=solved===null?progress.completed:progress.completed.filter(id=>id!==islandQuests[solved].id)
  const closeQuest=()=>{setActive(null);if(solved!==null){setEvent(solved);setSolved(null)}else requestAnimationFrame(()=>document.querySelector<HTMLElement>('.island-canvas')?.focus({preventScroll:true}))}

  const done=islandQuests.filter(q=>progress.completed.includes(q.id)).length
  const current=Math.max(0,islandQuests.findIndex(q=>!progress.completed.includes(q.id)))
  const finished=done===islandQuests.length
  const quest=islandQuests[current]
  const updatePosition=useCallback((p:Position,n:number|null)=>{setPosition(p);setNearby(n)},[])
  const unavailable=useCallback(()=>setFallback(true),[])
  const interact=(index:number)=>{
    if(!progress.completed.includes(islandQuests[index].id)&&islandQuests.slice(0,index).some(q=>!progress.completed.includes(q.id))){setMessage('Сначала помоги предыдущему жителю: '+quest.npc+'.');return}
    setDirection({x:0,y:0});setActive(index)
  }
  const goTo=(index:number)=>{setEvent(null);if(fallback){interact(index);return}document.querySelector('.adventure-stage')?.scrollIntoView({block:'start',behavior:'instant'});setDestination({index,serial:++serial.current});document.querySelector<HTMLElement>('.island-canvas')?.focus({preventScroll:true})}
  return <div className="adventure-view">
    <header className="adventure-heading"><div><span className="section-kicker">ПРИКЛЮЧЕНИЕ / ГЛАВА 1</span><h1>Остров Тихой бухты</h1><p>Исследуй деревню. Помогай жителям. Меняй мир своим кодом.</p></div><button className="button secondary" type="button" onClick={onCourse}><BookOpen size={17}/>Курс Python</button></header>
    <section className={`adventure-stage${event!==null?' has-story':''}`} aria-label="Игровой мир">
      <IslandWorld completed={visualCompleted} event={event} paused={active!==null||event!==null} motion={progress.motion} zoom={zoom} direction={direction} destination={destination} onPosition={updatePosition} onInteract={interact} onUnavailable={unavailable}/>
      <div className="island-objective"><span><Compass size={18}/>{finished?'ОСТРОВ СНОВА ЖИВЁТ':'СЕЙЧАС В ПРИКЛЮЧЕНИИ'}</span><strong>{finished?'Маяк зажжён. Спасибо, исследователь!':quest.name}</strong><small>{finished?'Можно гулять и повторять задания.':quest.npc+' · '+quest.topic}</small>{!finished&&!fallback&&<button type="button" onClick={()=>goTo(current)}><Footprints size={15}/>Идти к цели</button>}{fallback&&!finished&&<button type="button" onClick={()=>interact(current)}>Открыть задание</button>}</div>
      <div className="island-minimap" aria-label="Карта острова">{done===0&&<strong className="map-locked">Карта у Миры</strong>}<svg viewBox="-14 -10 28 20" role="img" aria-label="Твоё положение и четыре жителя"><ellipse rx="12.8" ry="8.8" fill="#a7b67c"/><path d="M2,-9 L5,-9 L5,9 L2,9Z" fill="#76b9bd"/>{islandQuests.filter((_,i)=>done>0||i===0).map((q,i)=><circle key={q.id} cx={q.x} cy={q.z} r=".58" fill={progress.completed.includes(q.id)?'#62806b':i===current?'#ffe7a1':'#c4ba99'}/>)}<circle cx={position.x} cy={position.z} r=".65" fill="#fff" stroke="#385260" strokeWidth=".25"/></svg><span><MapPin size={12}/>{done}/4 жителей получили помощь</span></div>
      {done>0&&<div className="island-inventory" aria-label="Полученные предметы"><span>✦ Искра с тобой</span>{islandQuests.filter(q=>progress.completed.includes(q.id)).map(q=><span key={q.id}>{q.reward}</span>)}</div>}
      {event!==null&&<div ref={storyPanel} tabIndex={-1} className="island-story" role="region" aria-label="Продолжение истории">
        <div className="story-badge">{event===3?'ГЛАВА ПРОЙДЕНА':'МИР ИЗМЕНИЛСЯ'} · +{islandQuests[event].xp} XP</div>
        <h2>{['Искра просыпается','Дорога открыта','На другой берег','Свет Тихой бухты'][event]}</h2>
        <p><strong>{islandQuests[event].npc}:</strong> {islandQuests[event].reply}</p>
        <span className="story-reward"><Check size={16}/>{islandQuests[event].effect}</span>
        <div className="story-actions">{event<3?<button className="button primary" type="button" onClick={()=>goTo(event+1)}>Идти к {['Мире','Тиму','Бобу','Лее'][event+1]} <ArrowRight size={18}/></button>:<button className="button primary" type="button" onClick={onCourse}>Продолжить курс Python <ArrowRight size={18}/></button>}<button className="story-explore" type="button" onClick={()=>{setEvent(null);requestAnimationFrame(()=>document.querySelector<HTMLElement>('.island-canvas')?.focus({preventScroll:true}))}}>Исследовать самостоятельно</button></div>
      </div>}
      <label className="island-zoom">Масштаб<input aria-label="Масштаб острова" type="range" min=".7" max="1.5" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
      <div className="island-interaction" aria-live="polite">{nearby!==null&&!fallback?<button type="button" onClick={()=>interact(nearby)}><span>E</span><MessageCircle size={18}/>{islandQuests[nearby].npc}: поговорить</button>:<p>Нажми на землю или используй WASD / стрелки</p>}</div>
      <div className="island-dpad" aria-label="Управление героем">{([{label:'Идти вверх',x:0,y:1,icon:ArrowUp,cls:'up'},{label:'Идти влево',x:-1,y:0,icon:ArrowLeft,cls:'left'},{label:'Идти вниз',x:0,y:-1,icon:ArrowDown,cls:'down'},{label:'Идти вправо',x:1,y:0,icon:ArrowRight,cls:'right'}]).map(d=><button type="button" key={d.label} className={d.cls} aria-label={d.label} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();setDirection({x:d.x,y:d.y})}}} onKeyUp={()=>setDirection({x:0,y:0})} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDirection({x:d.x,y:d.y})}} onPointerUp={()=>setDirection({x:0,y:0})} onPointerCancel={()=>setDirection({x:0,y:0})} onLostPointerCapture={()=>setDirection({x:0,y:0})} onBlur={()=>setDirection({x:0,y:0})}><d.icon size={20}/></button>)}</div>
    </section>
    <div className="island-status" role="status"><Sparkles size={17}/><p>{message}</p><small>{storageStatus}</small></div>
    <section className="island-journal" aria-label="Журнал приключения"><div><span className="section-kicker">ТВОЯ ИСТОРИЯ</span><h2>Четыре маленьких открытия</h2><p>Это первый игровой уровень. Полный учебный маршрут — 24 урока Python.</p></div><ol>{islandQuests.map((q,i)=>{const complete=progress.completed.includes(q.id),locked=islandQuests.slice(0,i).some(x=>!progress.completed.includes(x.id));return <li key={q.id} className={complete?'done':i===current?'current':''}><span>{complete?<Check size={20}/>:String(i+1).padStart(2,'0')}</span><div><strong>{q.name}</strong><small>{q.topic}</small><p>{complete?q.reward:q.npc+' ждёт помощи'}</p></div><button type="button" disabled={locked} onClick={()=>fallback?interact(i):goTo(i)}>{fallback?'Открыть':complete?'Навестить':'Найти'}<ArrowRight size={15}/></button></li>})}</ol></section>
    {finished&&<section className="island-finale"><Sparkles size={28}/><div><h2>Ты зажёг маяк четырьмя программами.</h2><p>Дальше — условия, циклы и собственные функции. Они уже есть в курсе; новые районы острова будут развивать эти темы.</p></div><button className="button primary" type="button" onClick={onCourse}>Продолжить учиться <ArrowRight size={16}/></button></section>}
    {active!==null&&<QuestDialog key={islandQuests[active].id} quest={islandQuests[active]} onSolved={()=>{setSolved(active);setMessage(islandQuests[active].effect)}} onClose={closeQuest}/>}
  </div>
}
