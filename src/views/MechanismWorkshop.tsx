import {useEffect,useRef,useState} from 'react'
import {ArrowRight,Check,ChevronLeft,ChevronRight,Lightbulb,Pause,Play,RotateCcw,Square,Wrench} from 'lucide-react'
import {mechanismMissions,mechanismState,devices,pythonHelp} from '../lib/mechanisms'
import type {Device} from '../lib/mechanisms'
import {PythonRunner} from '../lib/pythonRunner'
import type {PythonResult} from '../lib/pythonRunner'
import {useProgress} from '../state/useProgress'
import {AssistedCodeInput} from '../components/AssistedCodeInput'
import {MechanismScene} from '../components/MechanismScene'
import './mechanisms.css'

export function MechanismWorkshop() {
  const {progress}=useProgress()
  const [index,setIndex]=useState(()=>{const n=mechanismMissions.findIndex(m=>!progress.completed.includes(m.id));return n<0?0:n})
  const done=mechanismMissions.filter(m=>progress.completed.includes(m.id)).length
  const firstUnfinished=mechanismMissions.findIndex(m=>!progress.completed.includes(m.id))
  return <section className="mechanisms">
    <header className="mechanism-heading"><div><span className="section-kicker">ТИХАЯ БУХТА / PYTHON</span><h1>Мастерская механизмов</h1><p>Напиши код. Верни острову свет, воду и движение.</p></div><div className="mechanism-progress"><Wrench size={24}/><strong>{done} / 6</strong><span>заказов выполнено</span></div></header>
    <nav className="mechanism-orders" aria-label="Заказы мастерской">{mechanismMissions.map((m,i)=><button type="button" key={m.id} disabled={firstUnfinished>=0&&i>firstUnfinished&&!progress.completed.includes(m.id)} aria-current={index===i?'step':undefined} onClick={()=>setIndex(i)}><span>{progress.completed.includes(m.id)?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><span>{m.title}<small>{m.topic}</small></span></button>)}</nav>
    <MechanismOrder key={mechanismMissions[index].id} index={index} onNext={()=>{setIndex(i=>Math.min(5,i+1));document.querySelector('.mechanism-orders')?.scrollIntoView({block:'start'})}}/>
  </section>
}

function MechanismOrder({index,onNext}:{index:number;onNext:()=>void}) {
  const mission=mechanismMissions[index],{progress,saveDraft,completeMission}=useProgress()
  const code=progress.drafts[mission.id]??mission.starter
  const [theory,setTheory]=useState(!progress.completed.includes(mission.id)),[choice,setChoice]=useState<number|null>(null),[hints,setHints]=useState(0)
  const [result,setResult]=useState<PythonResult|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [demo,setDemo]=useState(false),[source,setSource]=useState(''),[step,setStep]=useState(0),[playing,setPlaying]=useState(false),[selected,setSelected]=useState<Device>(mission.device as Device)
  const runner=useRef(new PythonRunner()),generation=useRef({value:0}),running=useRef(false),oldCode=useRef(code)
  const trace=result?(result.traceTruncated?[...result.trace,{line:0,variables:result.variables,output:result.output}]:result.trace):[]
  const traceLength=trace.length
  useEffect(()=>{const r=runner.current,g=generation.current;return()=>{g.value++;r.stop()}},[])
  useEffect(()=>{
    if(code!==oldCode.current){oldCode.current=code;generation.current.value++;runner.current.stop();running.current=false;setBusy(false);setStatus('');setResult(null);setError('');setPlaying(false)}
  },[code])
  useEffect(()=>{
    if(!playing||!traceLength)return
    if(step>=traceLength-1)return
    const timer=setTimeout(()=>{setStep(s=>s+1);if(step+1>=traceLength-1)setPlaying(false)},950);return()=>clearTimeout(timer)
  },[playing,step,traceLength])
  function change(next:string){generation.current.value++;runner.current.stop();running.current=false;setBusy(false);setResult(null);setError('');setPlaying(false);saveDraft(mission.id,next)}
  async function run(example=false) {
    if(running.current)return
    const request=++generation.current.value,submitted=example?mission.example:code
    running.current=true;setBusy(true);setDemo(example);setSource(submitted);setResult(null);setError('');setPlaying(false);setStatus('Подготовка Python…')
    try {
      const r=await runner.current.run(submitted,example?[]:mission.checks,'',s=>{if(request===generation.current.value)setStatus(s)})
      if(request!==generation.current.value)return
      setResult(r);setStep(r.error?Math.max(0,r.trace.length+(r.traceTruncated?1:0)-1):0)
      setPlaying(!r.error&&r.trace.length>1&&progress.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)
      if(!example&&!r.error&&r.tests.length&&r.tests.every(t=>t.passed))completeMission(mission.id,mission.xp)
    }catch(e){if(request===generation.current.value)setError((e as Error).message)}
    finally {if(request===generation.current.value){running.current=false;setBusy(false);setStatus('')}}
  }
  const passed=Boolean(result&&!demo&&!result.error&&result.tests.length&&result.tests.every(t=>t.passed))
  const snapshot=trace[step],vars=snapshot?.variables??result?.variables??[],state=mechanismState(vars)
  const currentDevice=devices.find(d=>d.id===selected)!,currentVar=vars.find(v=>v.name===selected)
  const failure=error||result?.error||''
  return <>
    <div className="mechanism-layout">
      <div className="mechanism-desk">
        <div className="mechanism-brief"><span className="mechanism-pace">ЗАКАЗ {index+1} · 5–10 МИНУТ · БЕЗ ТАЙМЕРА</span><h2>{mission.title}</h2><p>{mission.story}</p></div>
        <button type="button" className="mechanism-theory-toggle" aria-expanded={theory} onClick={()=>setTheory(!theory)}><Lightbulb size={18}/>Как это работает <span>{theory?'−':'+'}</span></button>
        {theory&&<div className="mechanism-theory"><p>{mission.theory}</p><pre>{mission.example}</pre><button type="button" className="button secondary" disabled={busy} onClick={()=>void run(true)}><Play size={16}/>Посмотреть пример</button><p className="mechanism-example-note">{mission.explain}</p><fieldset><legend>{mission.prediction}</legend>{mission.options.map((option,i)=><button type="button" key={option} aria-pressed={choice===i} onClick={()=>setChoice(i)}>{option}</button>)}</fieldset>{choice!==null&&<p className="mechanism-prediction" role="status">{choice===mission.correct?'Верно. Теперь проверь идею своей программой.':'Попробуй ещё раз. Выполни пример по шагам и посмотри на значения.'}</p>}</div>}
        <div className="mechanism-task"><strong>Твой заказ</strong><p>{mission.task}</p></div>
        <div className="lab-code mechanism-code"><label htmlFor="mechanism-code"><span>workshop.py</span><button type="button" aria-label="Вернуть начальный код" onClick={()=>change(mission.starter)}><RotateCcw size={16}/></button></label>
          <AssistedCodeInput id="mechanism-code" label="Python-код механизмов" autoGrow language="python" value={code} onChange={change} onRun={()=>void run()}/>
          <div className="lab-run-row"><span>Ctrl + Enter</span>{busy?<button type="button" className="button secondary" onClick={()=>runner.current.stop()}><Square size={16}/>Остановить</button>:<button type="button" className="button primary" onClick={()=>void run()}><Play size={17}/>Запустить устройства</button>}</div>
        </div>
        <div className="mechanism-status" role="status">{busy?status:demo?'Учебный пример. Твой черновик сохранён, XP не начисляется.':result?'Программа выполнена. Исследуй шаги и показатели справа.':'Измени код и запусти устройства. Можно пробовать сколько угодно.'}</div>
        {result&&<button type="button" className="mechanism-mobile-jump" onClick={()=>document.querySelector('.mechanism-world')?.scrollIntoView({block:'start'})}>Посмотреть устройства ↑</button>}
        {failure&&<div className="mechanism-error" role="alert"><strong>{pythonHelp(failure)}</strong><pre>{failure}</pre></div>}
        <button className="mechanism-hint" type="button" disabled={hints>=3} onClick={()=>setHints(h=>h+1)}><Lightbulb size={17}/>Подсказка {hints}/3</button>{hints>0&&<p className="mechanism-hint-text">{mission.hints[hints-1]}</p>}
      </div>
      <div className="mechanism-world">
        <div className="mechanism-world-title"><span><i/>{demo?'Пробный режим':passed?'Заказ выполнен':'Станция Тихой бухты'}</span><small>{result?'Нажми на устройство, чтобы изучить его':'Устройства ждут твою программу'}</small></div>
        <button type="button" className="mechanism-mobile-jump" onClick={()=>document.querySelector('.mechanism-desk')?.scrollIntoView({block:'start'})}>К заданию и коду ↓</button>
        <MechanismScene state={state} selected={selected} onSelect={setSelected} motion={progress.motion} finished={passed}/>
        <div className="mechanism-inspector"><div><strong>{currentDevice.title}</strong><code>{selected}</code></div><p>{currentDevice.description}</p><span>{currentVar?`${currentVar.value} · ${currentVar.type}`:'Переменная ещё не создана'}</span></div>
        <div className="mechanism-device-grid" aria-label="Устройства мастерской">{devices.map(d=>{const v=vars.find(v=>v.name===d.id),target=mission.targets.find(t=>t.name===d.id);return <button type="button" key={d.id} aria-pressed={selected===d.id} onClick={()=>setSelected(d.id)}><span>{d.title}<code>{d.id}</code></span><strong>{v?v.value:'—'}</strong><small>{v?v.type:'нет значения'}{target?` · цель: ${target.value}`:''}</small>{d.max>0&&<meter min={0} max={d.max} value={state[d.id as 'power'|'water'|'speed']} aria-label={d.title}/>}</button>})}</div>
        <div className="mechanism-trace">
          <div className="mechanism-trace-heading"><strong>Код в действии</strong><span>{snapshot?`Шаг ${step+1} / ${traceLength}`:'После запуска здесь появятся шаги'}</span></div>
          {snapshot?<><div className="mechanism-current-line"><span>{snapshot.line?`Строка ${snapshot.line}`:'Результат'}</span><code>{snapshot.line?source.split('\n')[snapshot.line-1]:'Программа завершена'}</code></div><div className="mechanism-playback"><button type="button" aria-label="Предыдущий шаг" disabled={!step} onClick={()=>{setPlaying(false);setStep(s=>s-1)}}><ChevronLeft size={19}/></button><button type="button" onClick={()=>{if(step>=traceLength-1)setStep(0);setPlaying(traceLength>1&&!playing)}}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Пауза':'Воспроизвести'}</button><button type="button" aria-label="Следующий шаг" disabled={step>=traceLength-1} onClick={()=>{setPlaying(false);setStep(s=>s+1)}}><ChevronRight size={19}/></button><button type="button" onClick={()=>{setPlaying(false);setStep(traceLength-1)}}>К результату</button></div><dl className="mechanism-variables">{vars.map(v=><div key={v.name}><dt>{v.name}<small>{v.type}</small></dt><dd>{v.value}</dd></div>)}</dl>{snapshot.output&&<pre className="mechanism-output">{snapshot.output}</pre>}{result!.traceTruncated&&<p>Записаны первые 120 шагов. «К результату» показывает итоговые значения всей программы.</p>}</>:<p>Python выполнит строки сверху вниз. Ты сможешь остановить воспроизведение и увидеть значения после каждой строки.</p>}
        </div>
        {result&&!demo&&<section className={`mechanism-verdict ${passed?'is-passed':''}`} aria-label="Проверка заказа"><h3>{passed?'Работает! Заказ готов.':'Давай настроим точнее'}</h3>{result.tests.map(t=><p key={t.label}><span>{t.passed?'✓':'○'}</span>{t.label}</p>)}{!passed&&!failure&&<p>Сравни значение и тип с целью под устройством. Для проверки формулы используется и другой набор исходных данных.</p>}{passed&&<><strong>{mission.reward} · {mission.xp} XP за первое прохождение</strong><p>{mission.reply}</p>{index<5?<button type="button" className="button primary" onClick={onNext}>Следующий заказ <ArrowRight size={17}/></button>:<div className="mechanism-finale"><Wrench size={22}/><span>Мастер механизмов<br/><small>Все шесть заказов доступны для повторения и экспериментов.</small></span></div>}</>}</section>}
      </div>
    </div>
    <p className="mechanism-footnote">Показатели отражают выбранный шаг программы. Шкалы сцены ограничены диапазонами устройств, точные значения Python показаны рядом. Черновики и выполненные заказы сохраняются в твоём прогрессе.</p>
  </>
}
