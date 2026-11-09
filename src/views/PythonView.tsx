import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Code2, Download, Lightbulb, RotateCcw, Square, Trophy } from 'lucide-react'
import { pythonChapters, pythonLessons } from '../data/pythonCourse'
import type { PythonLesson } from '../data/pythonCourse'
import { PythonRunner } from '../lib/pythonRunner'
import type { PythonResult } from '../lib/pythonRunner'
import { useProgress } from '../state/useProgress'
import { ProgramStage } from '../components/ProgramStage'
import { CodeEditor } from '../components/CodeEditor'
import { BookReading } from '../components/BookReading'
import { VideoCourseSources, VideoLesson } from '../components/VideoLesson'

export function PythonView({ startChapter = null, onAdventure }: { startChapter?: number | null; onAdventure?: () => void }) {
  const { progress }=useProgress()
  const [index,setIndex]=useState(()=>startChapter!==null?startChapter*4:Math.max(0,pythonLessons.findIndex(l=>!progress.completed.includes(l.id))))
  const completed=pythonLessons.filter(l=>progress.completed.includes(l.id)).length
  const lesson=pythonLessons[index]
  const select=(i:number)=>{setIndex(i);document.getElementById('python-workspace')?.scrollIntoView({behavior:'instant',block:'start'})}
  return <div className="python-course">
    <div className="course-topline"><span className="section-kicker">ПУТЬ ИССЛЕДОВАТЕЛЯ / PYTHON</span><span>{completed} / 24 урока</span></div>
    <div className="python-heading"><div><h1>От первой строки<br/>к своей программе.</h1><p>24 урока · 6 глав · теория, практика и собственный проект</p></div><div className="course-progress-ring" style={{'--completion':completed/24*100+'%'} as React.CSSProperties}><span>{Math.round(completed/24*100)}<small>%</small></span></div></div>
    {onAdventure&&<button type="button" className="course-adventure-link" onClick={onAdventure}>Закрепить первые 4 темы в игре «Остров Тихой бухты» <ArrowRight size={17}/></button>}
    <VideoCourseSources onSelect={select}/>
    <div className="python-layout">
      <details className="syllabus" open><summary><BookOpen size={18}/> Программа курса</summary>
        {pythonChapters.map((chapter,c)=><section key={chapter.title}><h2><span>0{c+1}</span>{chapter.title}</h2>{pythonLessons.map((l,i)=>l.chapter===c&&<button type="button" key={l.id} className={i===index?'active':''} aria-current={i===index?'step':undefined} onClick={()=>select(i)}><span>{progress.completed.includes(l.id)?<Check size={14}/>:String(i+1).padStart(2,'0')}</span><span>{l.title.split(': ').at(-1)}</span></button>)}</section>)}
      </details>
      <div id="python-workspace" className="python-workspace"><PythonLessonView key={lesson.id} lesson={lesson} index={index} onPrevious={()=>select(index-1)} onNext={()=>select(Math.min(index+1,23))}/></div>
    </div>
  </div>
}
function PythonLessonView({lesson,index,onPrevious,onNext}:{lesson:PythonLesson;index:number;onPrevious:()=>void;onNext:()=>void}) {
  const {progress,completeMission,saveDraft,storageStatus}=useProgress()
  const [tab,setTab]=useState<'theory'|'quiz'|'code'>('theory')
  const code=progress.drafts[lesson.id]??lesson.starter
  const [stdin,setStdin]=useState(lesson.stdin)
  const [answer,setAnswer]=useState<number|null>(null),[checked,setChecked]=useState(false)
  const [result,setResult]=useState<PythonResult|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('')
  const [visual,setVisual]=useState<{result:PythonResult;source:string;demo:boolean}|null>(null),[runId,setRunId]=useState(0)
  const [activeLine,setActiveLine]=useState<number|undefined>()
  const [hint,setHint]=useState(0),[solutionOpen,setSolutionOpen]=useState(false)
  const runner=useRef(new PythonRunner()),alive=useRef(true),busyRef=useRef(false)
  const quizDone=progress.completed.includes(lesson.id+'-quiz')
  const done=progress.completed.includes(lesson.id)
  const correct=Boolean(result&&!result.error&&result.tests.length&&result.tests.every(t=>t.passed))
  useEffect(()=>{alive.current=true;const current=runner.current;return()=>{alive.current=false;current.stop()}},[])
  const run=async(demo=false)=>{
    if(busyRef.current)return
    busyRef.current=true;setBusy(true);setError('');setResult(null);setVisual(null);setActiveLine(undefined);setStatus('Подготавливаем запуск…')
    try{const value=await runner.current.run(demo?lesson.example:code,demo?[]:lesson.checks,stdin,s=>{if(alive.current)setStatus(s)});if(alive.current){if(!demo)setResult(value);setVisual({result:value,source:demo?lesson.example:code,demo});setRunId(i=>i+1)}}
    catch(e){if(alive.current)setError((e as Error).message)}
    finally{busyRef.current=false;if(alive.current){setBusy(false);setStatus('')}}
  }
  const change=(value:string)=>{if(busyRef.current)runner.current.stop();saveDraft(lesson.id,value);setResult(null);setVisual(null);setActiveLine(undefined);setError('')}
  const checkAnswer=()=>{setChecked(true);if(answer===lesson.quiz.correct)completeMission(lesson.id+'-quiz',10)}
  const download=()=>{const blob=new Blob([code],{type:'text/x-python;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=lesson.id+'.py';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return <>
    <header className="lesson-header"><span>Глава {lesson.chapter+1} · Урок {index+1} · около {lesson.minutes} минут</span><h2>{lesson.title}</h2><p>{lesson.story}</p></header>
    <div className="lesson-step-tabs" role="tablist" aria-label="Этапы урока">{([{id:'theory',label:'Разобраться',icon:BookOpen},{id:'quiz',label:'Проверить себя',icon:Lightbulb},{id:'code',label:'Написать код',icon:Code2}] as const).map((t,i)=><button key={t.id} type="button" role="tab" tabIndex={tab===t.id?0:-1} onKeyDown={e=>{const ids=['theory','quiz','code'] as const;let next=i;if(e.key==='ArrowRight')next=(i+1)%3;else if(e.key==='ArrowLeft')next=(i+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();setTab(ids[next]);document.getElementById('tab-'+ids[next])?.focus()}} aria-selected={tab===t.id} aria-controls={'panel-'+t.id} id={'tab-'+t.id} onClick={()=>setTab(t.id)}><span>0{i+1}</span><t.icon size={16}/>{t.label}{t.id==='quiz'&&quizDone&&<Check size={14}/>}</button>)}</div>
    {tab==='theory'&&<section id="panel-theory" role="tabpanel" aria-labelledby="tab-theory" className="theory-panel">
      <div className="theory-copy"><span className="reading-label">СНАЧАЛА ПОЙМИ ИДЕЮ</span><h3>{lesson.reading.title}</h3><p>{lesson.reading.explanation}</p>{lesson.theory.slice(1).map((p,i)=><p key={i}>{p}</p>)}</div>
      <div className="example-card"><div><span>Разобранный пример</span><span>Python</span></div><pre><code>{lesson.example}</code></pre><div className="example-output"><span>Что получится</span><pre>{lesson.exampleOutput}</pre></div></div>
      <div className="book-walkthrough"><h3>Разберём пример по шагам</h3><ol>{lesson.reading.walkthrough.map(step=><li key={step}>{step}</li>)}</ol><button className="button secondary" type="button" onClick={()=>{setTab('code');void run(true)}}>Посмотреть выполнение примера <ArrowRight size={17}/></button></div>
      <div className="book-experiment"><h3>Маленький эксперимент</h3><p>{lesson.reading.experiment}</p><details><summary>Проверить своё объяснение</summary><p>{lesson.reading.answer}</p></details></div>
      <BookReading reading={lesson.reading}/>
      <VideoLesson key={lesson.id} lessonId={lesson.id}/>
      <div className="concept-callout"><BookOpen size={20}/><p><strong>Попробуй объяснить своими словами.</strong> Что получает программа на вход, что делает и что получится? Затем переходи к вопросу.</p></div>
      <button className="button primary" type="button" onClick={()=>setTab('quiz')}>Проверить понимание <ArrowRight size={17}/></button>
    </section>}
    {tab==='quiz'&&<section id="panel-quiz" role="tabpanel" aria-labelledby="tab-quiz" className="quiz-panel">
      <span className="reading-label">ПРЕДСКАЖИ РЕЗУЛЬТАТ</span><h3>{lesson.quiz.question}</h3><div className="quiz-options">{lesson.quiz.options.map((o,i)=><label key={o} className={answer===i?'selected':''}><input type="radio" name={lesson.id+'-answer'} checked={answer===i} onChange={()=>{setAnswer(i);setChecked(false)}}/><span>{String.fromCharCode(65+i)}</span>{o}</label>)}</div>
      <button className="button primary" type="button" onClick={checkAnswer} disabled={answer===null}>Проверить ответ</button>
      {checked&&<div className={'quiz-feedback '+(answer===lesson.quiz.correct?'success':'retry')} role="status"><strong>{answer===lesson.quiz.correct?'Верно. Идём дальше!':'Давай разберёмся.'}</strong><p>{lesson.quiz.explanation}</p>{answer!==lesson.quiz.correct&&<p>Вернись к теории или попробуй ещё раз. За ошибку ничего не снимается.</p>}</div>}
      {quizDone&&<button className="button secondary" type="button" onClick={()=>setTab('code')}>Перейти к практике <ArrowRight size={17}/></button>}
    </section>}
    {tab==='code'&&<section id="panel-code" role="tabpanel" aria-labelledby="tab-code" className="practice-panel">
      <div className="practice-task"><span className="reading-label">ТВОЯ МИССИЯ</span><p>{lesson.task}</p></div>
      <div className="python-lab-grid"><div><CodeEditor activeLine={activeLine} value={code} fileName={'lesson_'+(index+1)+'.py'} onChange={change} onRun={()=>void run()} onReset={()=>change(lesson.starter)}/>
        <div className="python-run-tools"><label>Ввод для input()<textarea aria-label="Ввод для Python" value={stdin} maxLength={10000} onChange={e=>{if(busyRef.current)runner.current.stop();setStdin(e.target.value);setResult(null);setVisual(null);setActiveLine(undefined)}} rows={2} placeholder="Один ответ на строку"/></label><button type="button" className="button secondary" onClick={download}><Download size={15}/>Скачать .py</button></div>
        {busy&&<div className="python-loading" role="status"><i/>{status}<button type="button" onClick={()=>runner.current.stop()}><Square size={14}/> Остановить</button></div>}
        {error&&<div className="python-error" role="alert">{error}</div>}
        <div className="python-console" aria-live="polite"><div>КОНСОЛЬ PYTHON <span>{result?'Запуск завершён':'Здесь появится результат'}</span></div><pre>{result?.output||'›'}</pre>{result?.error&&<p role="alert">{result.error}</p>}</div>
      </div><div className="lesson-world"><ProgramStage key={runId} result={visual?.result??null} source={visual?.source??code} demo={visual?.demo??false} busy={busy} onDemo={()=>void run(true)} onStep={setActiveLine}/>{Boolean(result?.variables.length)&&<details className="final-memory"><summary>Все значения в конце программы</summary><dl className="variable-list" aria-label="Значения переменных">{result!.variables.map(v=><div key={v.name}><dt><code>{v.name}</code><small>{v.type}</small></dt><dd><code>{v.value}</code></dd></div>)}</dl></details>}{result&&<div className="python-checks">{result.tests.map(t=><p key={t.label} className={t.passed?'passed':''}>{t.passed?<Check size={16}/>:<RotateCcw size={16}/>} {t.label}</p>)}</div>}</div></div>
      <div className="lesson-help"><button type="button" onClick={()=>setHint(h=>Math.min(h+1,lesson.hints.length))}><Lightbulb size={17}/>Подсказка {hint}/{lesson.hints.length}</button><button type="button" onClick={()=>setSolutionOpen(v=>!v)}>{solutionOpen?'Скрыть разбор':'Разобрать решение'}</button></div>
      {hint>0&&<p className="lesson-hint">{lesson.hints[hint-1]}</p>}
      {solutionOpen&&<details className="solution-panel" open><summary>Пример решения: прочитай, затем напиши самостоятельно</summary><pre>{lesson.solution}</pre><p>Сравни каждую строку с целью задания. Измени данные и предскажи, как изменится результат.</p></details>}
      <div className="lesson-finish">{done?<p><Trophy size={20}/>Урок завершён. Можно повторить в любое время.</p>:correct&&quizDone?<button className="button primary" type="button" onClick={()=>completeMission(lesson.id,lesson.xp)}><Check size={18}/>Завершить урок · +{lesson.xp} XP</button>:<p>{correct?'Код работает! Осталось правильно ответить на вопрос во вкладке «Проверить себя».':'Пройди вопрос и проверки кода, чтобы завершить урок.'}</p>}</div>
    </section>}
    <footer className="lesson-navigation"><button type="button" onClick={onPrevious} disabled={index===0}><ArrowLeft size={16}/>Назад</button><small>{storageStatus}</small>{index<23?<button type="button" onClick={onNext}>Следующий урок <ArrowRight size={16}/></button>:<span>Финал курса <Trophy size={17}/></span>}</footer>
    {done&&index===23&&<div className="course-certificate"><Trophy size={32}/><h3>Твой первый проект работает.</h3><p>Продолжай развивать диспетчер: добавь сохранение в файл, меню команд и проверки. Код можно скачать во вкладке практики.</p></div>}
  </>
}
