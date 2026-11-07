import { useState } from 'react'
import { BookOpen, Search, ArrowRight } from 'lucide-react'
import { pythonLessons, pythonChapters } from '../data/pythonCourse'
export function HandbookView({onPython}:{onPython:()=>void}) {
  const [query,setQuery]=useState('')
  const found=pythonLessons.filter(l=>(l.title+' '+l.theory.join(' ')).toLowerCase().includes(query.toLowerCase().trim()))
  return <div className="handbook-view"><div className="view-heading"><div><span className="section-kicker">ТВОЯ НАСТОЛЬНАЯ КНИГА</span><h1>Вспомни. Попробуй. Пойми.</h1><p>Понятия Python, короткие объяснения и примеры. Справочник всегда под рукой.</p></div></div><label className="handbook-search"><Search size={19}/><input aria-label="Найти понятие" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Переменные, циклы, списки, return…"/></label><p className="handbook-count">Найдено понятий: {found.length}</p><div className="handbook-list">{found.map(l=><details key={l.id}><summary><BookOpen size={18}/><span>{l.title}<small>{pythonChapters[l.chapter].title}</small></span><span>+</span></summary><div><p>{l.theory[0]}</p><pre><code>{l.example}</code></pre><p className="handbook-note">{l.theory[1]}</p></div></details>)}</div>{!found.length&&<p className="empty-state">Не нашли понятие. Попробуй «функции» или «списки».</p>}<button className="button primary" type="button" onClick={onPython}>Пройти курс Python <ArrowRight size={17}/></button></div>
}
