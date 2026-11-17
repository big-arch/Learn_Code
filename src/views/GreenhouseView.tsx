import { useEffect,useRef,useState } from 'react'
import { ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Check,Leaf,Lightbulb,Play,RotateCcw,Square } from 'lucide-react'
import { greenhouseLessons,greenFormats,greenText,greenChecks,greenSource,greenState,defaultSensors } from '../lib/greenhouse'
import type { Sensors } from '../lib/greenhouse'
import { lessonEvidence,skillState } from '../lib/learning'
import { useProgress } from '../state/useProgress'
import { PythonRunner } from '../lib/pythonRunner'
import type { PythonResult } from '../lib/pythonRunner'
import { AssistedCodeInput } from '../components/AssistedCodeInput'
import { GreenhouseScene } from '../components/GreenhouseScene'
import './greenhouse.css'

export function GreenhouseView({start=0,review=false,onHome,onPython}:{start?:number;review?:boolean;onHome:()=>void;onPython:()=>void}){
 const {progress}=useProgress(),[index,setIndex]=useState(start),[repeating,setRepeating]=useState(review)
 const done=greenhouseLessons.filter(l=>progress.completed.includes(l.id)).length
 function select(i:number,r=false){setIndex(i);setRepeating(r);document.querySelector('.green-heading')?.scrollIntoView({block:'start'})}
 return <section className="greenhouse">
  <button className="text-link" onClick={onHome}><ArrowLeft size={16}/>Мой учебный путь</button>
  <header className="green-heading"><div><span className="section-kicker">ТИХАЯ БУХТА / УСЛОВИЯ В PYTHON</span><h1>Умная теплица<span>Код, о котором можно позаботиться.</span></h1><p>От показания датчика до надёжного решения. Восемь занятий, разные способы попробовать и время разобраться.</p></div><div className="green-chapter-progress"><Leaf size={26}/><strong>{done} из 8</strong><span>занятий пройдено</span><progress value={done} max={8}/></div></header>
  <details className="green-route" open><summary>Маршрут главы <span>Выбирай занятие или продолжай по порядку</span></summary><nav aria-label="Занятия теплицы">{greenhouseLessons.map((l,i)=><button key={l.id} type="button" aria-current={i===index?'step':undefined} onClick={()=>select(i)}><span>{progress.completed.includes(l.id)?<Check size={17}/>:String(i+1).padStart(2,'0')}</span><span><strong>{l.title}</strong><small>{greenFormats[l.kind]}</small></span></button>)}</nav></details>
  <GreenExercise key={index+':'+repeating} index={index} review={repeating} onNext={()=>select(index+1)} onReview={()=>select(index,true)} onHome={onHome} onPython={onPython}/>
 </section>
}

function GreenExercise({index,review,onNext,onReview,onHome,onPython}:{index:number;review:boolean;onNext:()=>void;onReview:()=>void;onHome:()=>void;onPython:()=>void}){
 const baseLesson=greenhouseLessons[index],lesson={...baseLesson,...(review?baseLesson.review:undefined)},{progress,saveDraft,completeMission,recordLearning,storageStatus}=useProgress(),variant=review?'review':'lesson'
 const t=(text:string)=>greenText(text,review),draftKey=lesson.id+(review?'-review':'')
 const code=progress.drafts[draftKey]??t(lesson.starter)
 const events=lessonEvidence(progress,lesson.id).filter(e=>e.variant===variant)
 const [openedHint,setHint]=useState(0),[choice,setChoice]=useState<number|null>(null)
 const hint=Math.max(openedHint,Math.min(3,events.filter(e=>e.kind==='hint').length))
 const [theory,setTheory]=useState(!review),[manual,setManual]=useState(false)
 const [sensors,setSensors]=useState<Sensors>(review?{moisture:48,temperature:34,tank:2}:defaultSensors)
 const [result,setResult]=useState<PythonResult|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[demo,setDemo]=useState(false)
 const runner=useRef(new PythonRunner()),generation=useRef(0),running=useRef(false),visited=useRef(false),priorCode=useRef(code),recordRef=useRef(recordLearning)
 useEffect(()=>{recordRef.current=recordLearning},[recordLearning])
 const helped=hint>0||events.some(e=>e.kind==='hint')||(lesson.kind==='predict'&&events.some(e=>e.kind==='attempt'&&!e.passed))
 function evidence(kind:'visit'|'attempt'|'hint',passed=false){recordLearning({lesson:lesson.id,version:lesson.version,kind,variant,passed,helped:kind==='hint'||helped})}
 useEffect(()=>{if(!visited.current){visited.current=true;recordRef.current({lesson:lesson.id,version:lesson.version,kind:'visit',variant,passed:false,helped:false})}const r=runner.current,counter=generation;return()=>{counter.current++;r.stop()}},[lesson.id,lesson.version,variant])
 function clear(){generation.current++;runner.current.stop();running.current=false;setBusy(false);setResult(null);setError('');setStatus('')}
 useEffect(()=>{if(priorCode.current!==code){priorCode.current=code;clear()}},[code])
 function change(value:string){clear();saveDraft(draftKey,value)}
 function sensor(key:keyof Sensors,value:number){clear();setSensors(s=>({...s,[key]:value}))}
 function move(line:number,offset:number){const lines=code.split('\n'),other=line+offset;if(other<0||other>=lines.length)return;[lines[line],lines[other]]=[lines[other],lines[line]];change(lines.join('\n'))}
 async function run(example=false){
  if(running.current)return
  if(!example&&(lesson.kind==='predict'||lesson.kind==='choose')&&choice===null)return
  const submitted=example?t(lesson.example):lesson.kind==='choose'?'water = '+t(lesson.options[choice!]):code
  const source=example?submitted:greenSource(submitted,sensors),request=++generation.current
  running.current=true;setBusy(true);setDemo(example);setResult(null);setError('')
  try{
   const r=await runner.current.run(source,example||lesson.kind==='predict'?[]:greenChecks(index,review),'',s=>{if(request===generation.current)setStatus(s)})
   if(request!==generation.current)return
   if(!example&&lesson.kind==='predict')r.tests=[{label:'Прогноз совпадает с результатом сравнения',passed:choice===lesson.correct}]
   setResult(r)
   if(!example){const passed=!r.error&&r.tests.length>0&&r.tests.every(test=>test.passed);evidence('attempt',passed);if(passed&&!review)completeMission(lesson.id,lesson.xp)}
  }catch(e){if(request===generation.current)setError((e as Error).message)}finally{if(request===generation.current){running.current=false;setBusy(false);setStatus('')}}
 }
 const passed=!!result&&!demo&&!result.error&&result.tests.length>0&&result.tests.every(test=>test.passed)
 const state=greenState(result?.variables??[]),failed=result?.tests.find(test=>!test.passed),skill=skillState(progress,lesson.id)
 const failure=error||result?.error||''
 const prediction=t(lesson.task)
 const actualSensors=demo?{moisture:Number(result?.variables.find(v=>v.name==='moisture')?.value??sensors.moisture),temperature:Number(result?.variables.find(v=>v.name==='temperature')?.value??sensors.temperature),tank:sensors.tank}:sensors
 const advice=failure.includes('IndentationError')?'Python не увидел нужный отступ. Строки внутри if и else должны начинаться с четырёх пробелов.':failure.includes('SyntaxError')?'Проверь выражение справа от =, закрывающие скобки и кавычки. После if и else нужно двоеточие.':failure.includes('NameError')?'Проверь написание имени: moisture, temperature и tank уже доступны. True и False начинаются с большой буквы.':failed?'Разбери эти входные данные вручную. Какая ветка должна выполниться? '+failed.label:passed?t(lesson.why):'Начни с требования: какие данные поступают и при каком условии устройство должно включиться?'
 return <>
  {review&&<div className="green-review-note"><RotateCcw size={19}/><div><strong>Повторение на новых данных</strong><p>Теперь порог влажности 45%, температуры 30°C. Условие изменилось: напиши решение заново. Повторение уточняет навыки и не начисляет XP повторно.</p></div></div>}
  <div className="green-mobile-jumps"><a href="#green-task">К заданию</a><a href="#green-world">К теплице</a></div>
  <div className="green-layout">
   <article className="green-desk" id="green-task">
    <div className="green-lesson-top"><span>ЗАНЯТИЕ {index+1} · ОКОЛО {lesson.minutes} МИНУТ</span><span>{greenFormats[lesson.kind]}</span></div>
    <h2>{lesson.title}</h2><p className="green-story">{t(lesson.story)}</p><p className="green-goal"><strong>Научишься</strong> {t(lesson.goal)}</p>
    <button type="button" className="green-theory-toggle" aria-expanded={theory} onClick={()=>setTheory(!theory)}>Разобраться в идее <span>{theory?'−':'+'}</span></button>
    {theory&&<div className="green-theory">{lesson.theory.map(p=><p key={p}>{t(p)}</p>)}<pre>{t(lesson.example)}</pre><p>{t(lesson.walkthrough)}</p><button type="button" className="button secondary" disabled={busy} onClick={()=>void run(true)}><Play size={16}/>Выполнить пример</button><button type="button" className="text-link" onClick={()=>setTheory(false)}>Понятно, к практике <ArrowRight size={16}/></button></div>}
    <div className="green-assignment"><h3>Твоя задача</h3><p>{prediction}</p></div>
    {(lesson.kind==='predict'||lesson.kind==='choose')?<fieldset className="green-choices"><legend>{lesson.kind==='predict'?'Выбери прогноз':'Выбери выражение'}</legend>{lesson.options.map((option,i)=><label key={option}><input type="radio" name="green-choice" checked={choice===i} onChange={()=>{clear();setChoice(i)}}/><span>{t(option)}</span></label>)}</fieldset>:<>
     {lesson.kind==='order'&&!manual&&<div className="green-lines" aria-label="Порядок строк">{code.split('\n').slice(0,12).map((line,i,lines)=><div key={i}><code>{line||' '}</code><button type="button" aria-label={'Поднять строку '+(i+1)} disabled={i===0} onClick={()=>move(i,-1)}><ArrowUp size={16}/></button><button type="button" aria-label={'Опустить строку '+(i+1)} disabled={i===lines.length-1} onClick={()=>move(i,1)}><ArrowDown size={16}/></button></div>)}<button type="button" className="text-link" onClick={()=>setManual(true)}>Перейти к редактору</button></div>}
     {(lesson.kind!=='order'||manual)&&<div className="green-editor"><div><span>greenhouse.py</span><button type="button" aria-label="Восстановить заготовку теплицы" onClick={()=>change(t(lesson.starter))}><RotateCcw size={16}/></button></div><AssistedCodeInput id="green-code" label="Python-код теплицы" value={code} onChange={change} onRun={()=>void run()} language="python" autoGrow/></div>}
    </>}
    {lesson.kind!=='predict'&&<small className="green-input-note">moisture, temperature и tank берутся с датчиков справа. Твоя программа проверяется и на других показаниях.</small>}
    <div className="green-run"><button type="button" className="button primary" disabled={busy||((lesson.kind==='predict'||lesson.kind==='choose')&&choice===null)} onClick={()=>void run()}><Play size={17}/>{busy?'Проверяем…':lesson.kind==='predict'?'Проверить прогноз':'Запустить и проверить'}</button>{busy&&<button type="button" className="button secondary" onClick={clear}><Square size={16}/>Остановить</button>}</div>
    <div className="green-live" role="status">{busy?status:failure||''}</div>
    {result&&!busy&&<div className={'green-verdict '+(passed?'is-passed':demo?'is-example':'is-retry')} role="status"><strong>{passed?'Получилось!':demo?'Выполнен учебный пример':failure?'Начнём с ошибки Python':'Проверим решение ещё раз'}</strong><p>{passed?t(lesson.why):demo?'Пример помогает разобраться и не засчитывает задание. Теперь попробуй своё решение.':failed?'Не прошла проверка: '+failed.label:'Исправь указанную строку и повтори запуск.'}</p>{passed&&<small>{skill.label} · {review?'Повторение сохранено':`Занятие сохранено · ${lesson.xp} XP за первое прохождение`}</small>}</div>}
    <section className="green-mentor"><h3><Lightbulb size={19}/>Разберём вместе</h3><p>{advice}</p>{hint>0&&<pre>{t(lesson.hints[Math.min(hint,3)-1])}</pre>}<button type="button" className="button secondary" disabled={hint>=3} onClick={()=>{setHint(hint+1);evidence('hint')}}>{hint>=3?'Все подсказки открыты':`Подсказка ${hint+1} из 3`}</button><small>Подсказки не уменьшают награду. В истории навыка будет отмечена помощь.</small><button className="text-link" type="button" onClick={onPython}>Вернуться к теории условий Python <ArrowRight size={15}/></button></section>
   </article>
   <aside className="green-world" id="green-world">
    <div className="green-world-heading"><span><Leaf size={18}/>ТЕПЛИЦА МИРЫ</span><small>{result?(demo?'Учебный пример':'Результат твоего кода'):'Ожидает запуска программы'}</small></div>
    <GreenhouseScene {...state} sensors={actualSensors} motion={progress.motion}/>
    <div className="green-devices"><div><span>Полив</span><strong>{state.water===null?'Не задан':state.water?'Включён':'Выключен'}</strong></div><div><span>Вентилятор</span><strong>{state.fan===null?'Не задан':state.fan?'Включён':'Выключен'}</strong></div>{state.mode&&<div><span>Режим</span><strong>{state.mode}</strong></div>}</div>
    <section className="green-sensors"><h3>Проверь свою гипотезу</h3><p>Измени показания и снова запусти код.</p>{(['moisture','temperature','tank'] as const).map(key=><label key={key}><span>{key==='moisture'?'Влажность':key==='temperature'?'Температура':'Вода в баке'} <code>{key}</code><strong>{sensors[key]}{key==='moisture'?'%':key==='temperature'?'°C':' л'}</strong></span><input type="range" aria-label={key==='moisture'?'Влажность датчика':key==='temperature'?'Температура датчика':'Вода в баке'} min={key==='moisture'&&index===7?-5:0} max={key==='moisture'?index===7?105:100:key==='temperature'?45:10} value={sensors[key]} disabled={lesson.kind==='predict'||(index===7&&key==='tank')} onChange={e=>sensor(key,Number(e.target.value))}/></label>)}</section>
    {result&&<section className="green-test-results" aria-label="Результаты проверок"><h3>{demo?'Наблюдение':'Проверки программы'}</h3>{result.tests.map((test,i)=><div key={i} className={test.passed?'pass':'fail'}><span aria-hidden="true">{test.passed?'✓':'↻'}</span><span>{test.label}</span></div>)}{result.output&&<><h4>Вывод Python</h4><pre>{result.output}</pre></>}<details><summary>Значения после выполнения</summary>{result.variables.map(v=><p key={v.name}><code>{v.name}</code> = <code>{v.value}</code></p>)}</details></section>}
    <small className="green-save-status">{storageStatus}</small>
   </aside>
  </div>
  {(passed||progress.completed.includes(lesson.id))&&<footer className="green-next"><div><span>СЛЕДУЮЩИЙ ШАГ</span><h3>{index<7?greenhouseLessons[index+1].title:'Глава пройдена. Дай знаниям закрепиться.'}</h3><p>{index<7?greenhouseLessons[index+1].goal:'Повтори условия на новых данных сейчас или вернись к ним позже через свой учебный путь.'}</p></div><div>{index<7?<button type="button" className="button primary" onClick={onNext}>Следующее занятие <ArrowRight size={17}/></button>:<button type="button" className="button primary" onClick={onHome}>К моему пути <ArrowRight size={17}/></button>}{!review&&<button type="button" className="button secondary" onClick={onReview}><RotateCcw size={16}/>Повторить на новых данных</button>}</div></footer>}
 </>
}
