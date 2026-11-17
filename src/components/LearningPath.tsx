import { ArrowRight,Leaf,RotateCcw } from 'lucide-react'
import { useProgress } from '../state/useProgress'
import { pythonLessons } from '../data/pythonCourse'
import { greenhouseLessons } from '../lib/greenhouse'
import { nextGreenLesson,skillState } from '../lib/learning'
import '../views/greenhouse.css'
export function LearningPath({onPython,onGreenhouse}:{onPython:()=>void;onGreenhouse:(index?:number,review?:boolean)=>void}){
 const {progress}=useProgress(),base=pythonLessons.slice(0,8).filter(l=>progress.completed.includes(l.id)).length,done=greenhouseLessons.filter(l=>progress.completed.includes(l.id)).length
 const next=nextGreenLesson(progress),started=Object.values(progress.learning??{}).some(e=>e.lesson.startsWith('greenhouse-'))
 const reviews=greenhouseLessons.map((l,i)=>({lesson:l,index:i,state:skillState(progress,l.id)})).filter(l=>l.state.due)
 const continueGreen=done<8&&(started||base===8),review=done===8&&reviews.length>0
 return <section className="learning-path" aria-label="Мой учебный путь"><div className="learning-path-top"><div><span className="section-kicker">МОЙ УЧЕБНЫЙ ПУТЬ</span><h2>{review?'Время освежить знакомую идею':continueGreen?greenhouseLessons[next].title:done===8?'Теплица работает. Продолжай открывать Python.':'Понятная цель на сегодня'}</h2><p>{continueGreen?greenhouseLessons[next].goal:review?'Короткое повторение на изменённых данных поможет проверить, что осталось в памяти.':done===8?'Следующий шаг в основном курсе: циклы, коллекции и функции. Пройденная глава останется доступна для повторения.':'Начни с вывода, переменных и условий Python. Затем примени знания в теплице: код будет управлять настоящими решениями.'}</p></div><button className="button primary" type="button" onClick={()=>review?onGreenhouse(reviews[0].index,true):continueGreen?onGreenhouse(next):onPython()}>Продолжить обучение <ArrowRight size={17}/></button></div>
  <div className="learning-steps"><button type="button" onClick={onPython}><b>01</b><span><strong>Разобраться в основах</strong><small>Первые восемь уроков Python · {base}/8</small></span></button><button type="button" onClick={()=>onGreenhouse(next)}><b>02</b><span><strong><Leaf size={17}/> Умная теплица</strong><small>Условия, логика и отладка · {done}/8</small></span></button><button type="button" disabled={!done} onClick={()=>onGreenhouse(Math.max(0,greenhouseLessons.findIndex(l=>progress.completed.includes(l.id))),done>0)}><b>03</b><span><strong>Закрепить на новых данных</strong><small>{done?'Другие пороги и проверка самостоятельности':'Откроется после первого занятия'}</small></span></button></div>
  {reviews.length>0&&<div className="learning-reviews"><p>Стоит повторить: после затруднения или перерыва.</p>{reviews.slice(0,3).map(r=><button type="button" key={r.lesson.id} onClick={()=>onGreenhouse(r.index,progress.completed.includes(r.lesson.id))}><RotateCcw size={14}/> {r.lesson.title}</button>)}</div>}
 </section>
}
export function GreenSkills({onOpen}:{onOpen:(index:number,review:boolean)=>void}){
 const {progress}=useProgress()
 return <section className="green-skills"><h2>Как продвигается понимание</h2><p>Наблюдения по занятиям теплицы. Они учитывают подсказки и повторение на новых данных, а не только начисленные XP.</p>{greenhouseLessons.map((l,i)=>{const s=skillState(progress,l.id);return <div className="green-skill-row" key={l.id}><div><strong>{l.title}</strong><small>{l.skill} · {s.label}</small></div><button type="button" className="button secondary" onClick={()=>onOpen(i,progress.completed.includes(l.id))}>{progress.completed.includes(l.id)?'Повторить':'К занятию'}</button></div>})}</section>
}
