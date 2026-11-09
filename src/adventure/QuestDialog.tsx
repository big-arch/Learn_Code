import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Code2, Lightbulb, Square, X } from 'lucide-react'
import type { IslandQuest } from '../data/adventure'
import { CodeEditor } from '../components/CodeEditor'
import { PythonRunner } from '../lib/pythonRunner'
import type { PythonResult } from '../lib/pythonRunner'
import { useProgress } from '../state/useProgress'

export function QuestDialog({quest,onClose,onSolved}:{quest:IslandQuest;onClose:()=>void;onSolved:()=>void}) {
  const {progress,saveDraft,completeMission}=useProgress()
  const dialog=useRef<HTMLDialogElement>(null),runner=useRef(new PythonRunner()),alive=useRef(true),running=useRef(false)
  const [practice,setPractice]=useState(false)
  const code=progress.drafts[quest.id]??quest.starter
  const [input,setInput]=useState(quest.stdin),[result,setResult]=useState<PythonResult|null>(null)
  const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[hint,setHint]=useState(false)
  const completed=progress.completed.includes(quest.id)
  const [initialCompleted]=useState(completed)
  const awarded=useRef(completed),victory=useRef<HTMLDivElement>(null)
  const passed=Boolean(result&&!result.error&&result.tests.length&&result.tests.every(t=>t.passed))
  useEffect(()=>{if(passed){victory.current?.scrollIntoView({block:'nearest'});victory.current?.focus({preventScroll:true})}},[passed])
  useEffect(()=>{
    alive.current=true;const current=runner.current,element=dialog.current
    element?.showModal()
    return()=>{alive.current=false;current.stop();element?.close()}
  },[])
  const change=(value:string)=>{runner.current.stop();saveDraft(quest.id,value);setResult(null);setError('')}
  const run=async()=>{
    if(running.current)return
    running.current=true;setBusy(true);setResult(null);setError('')
    try{const r=await runner.current.run(code,quest.checks,input,s=>{if(alive.current)setStatus(s)});if(alive.current){
      setResult(r)
      if(!r.error&&r.tests.length&&r.tests.every(t=>t.passed)&&!awarded.current){awarded.current=true;completeMission(quest.id,quest.xp);onSolved()}
    }}
    catch(e){if(alive.current)setError((e as Error).message)}
    finally{running.current=false;if(alive.current){setBusy(false);setStatus('')}}
  }
  return <dialog ref={dialog} className="island-dialog" aria-labelledby="island-quest-title" onCancel={e=>{e.preventDefault();onClose()}}>
    <div className="island-dialog-top"><span>ЖИТЕЛЬ ОСТРОВА · {quest.npc.toUpperCase()}</span><button type="button" className="icon-button" aria-label="Вернуться на остров" onClick={onClose}><X size={20}/></button></div>
    <header><div className="npc-portrait" aria-hidden="true">{quest.npc.slice(0,1)}</div><div><span>{quest.role}</span><h2 id="island-quest-title">{quest.name}</h2><small>{quest.topic} · +{quest.xp} XP</small></div></header>
    <p className="npc-dialogue">«{quest.story}»</p>
    <div className="quest-mode"><button type="button" aria-pressed={!practice} onClick={()=>setPractice(false)}><BookOpen size={16}/>Понять идею</button><button type="button" aria-pressed={practice} onClick={()=>setPractice(true)}><Code2 size={16}/>Написать код</button></div>
    {!practice?<section className="quest-theory"><p>{quest.theory}</p><pre>{quest.example}</pre><p className="quest-task"><strong>Твоя задача.</strong> {quest.task}</p><button className="button primary" type="button" onClick={()=>setPractice(true)}>Попробовать самому <ArrowRight size={17}/></button></section>:<section className="quest-practice">
      <p className="quest-task">{quest.task}</p>
      <CodeEditor value={code} fileName="island.py" onChange={change} onReset={()=>change(quest.starter)} onRun={()=>void run()}/>
      {quest.stdin&&<label className="quest-input">Кристаллы от Леи<input aria-label="Ввод в приключении" value={input} maxLength={100} onChange={e=>{runner.current.stop();setInput(e.target.value);setResult(null)}}/></label>}
      {busy&&<div className="quest-running" role="status">{status}<button type="button" onClick={()=>runner.current.stop()}><Square size={14}/>Остановить</button></div>}
      {error&&<p role="alert" className="python-error">{error}</p>}
      {result&&<div className="quest-result" aria-live="polite"><span>ТВОЯ ПРОГРАММА СКАЗАЛА</span><pre>{result.output||'Пока ничего не выведено.'}</pre>{!passed&&<strong>Задание пока не завершено — попробуй ещё раз.</strong>}{result.error&&<p role="alert">{result.error}</p>}{result.tests.map(t=><p key={t.label} className={t.passed?'passed':''}>{t.passed?'✓':'○'} {t.label}</p>)}</div>}
      <button type="button" className="quest-hint-button" onClick={()=>setHint(v=>!v)}><Lightbulb size={16}/>Нужна подсказка</button>{hint&&<p className="lesson-hint">{quest.hint}</p>}
    </section>}
    {completed&&<div ref={victory} tabIndex={-1} className="quest-victory" role="status"><small>{initialCompleted?'ЗАДАНИЕ УЖЕ ВЫПОЛНЕНО':`ЗАДАНИЕ ВЫПОЛНЕНО · +${quest.xp} XP`}</small><strong>Получено: {quest.reward}</strong><p>{quest.reply}</p><button className="button primary" type="button" onClick={onClose}>Продолжить приключение <ArrowRight size={17}/></button></div>}
  </dialog>
}
