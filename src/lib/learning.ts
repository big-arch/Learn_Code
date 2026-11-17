import type { ProgressState } from '../types'
import { greenhouseLessons } from './greenhouse'
export function lessonEvidence(progress:ProgressState,id:string){
 const version=greenhouseLessons.find(l=>l.id===id)?.version??1
 return Object.values(progress.learning??{}).filter(e=>e.lesson===id&&e.version===version).sort((a,b)=>b.at.localeCompare(a.at))
}
export function skillState(progress:ProgressState,id:string){
 const events=lessonEvidence(progress,id),passes=events.filter(e=>e.kind==='attempt'&&e.passed)
 const confirmed=passes.find(e=>e.variant==='review'&&!e.helped)
 const independent=passes.find(e=>!e.helped)
 const latest=events.find(e=>e.kind==='attempt')
 const lastPass=passes[0],due=latest&&!latest.passed||!!lastPass&&Date.now()-Date.parse(lastPass.at)>(confirmed?7:3)*86400000
 return {label:confirmed?'Повторил на новых данных':independent?'Решил самостоятельно':passes.length?'Решил с подсказкой':progress.completed.includes(id)?'Выполнено ранее':events.length?'Знакомлюсь':'Впереди',level:confirmed?3:independent?2:passes.length?1:0,due:!!due,lastPass}
}
export function nextGreenLesson(progress:ProgressState){
 const latest=Object.values(progress.learning??{}).filter(e=>e.kind==='visit'&&e.lesson.startsWith('greenhouse-')).sort((a,b)=>b.at.localeCompare(a.at))[0]
 if(latest&&!progress.completed.includes(latest.lesson))return greenhouseLessons.findIndex(l=>l.id===latest.lesson)
 const index=greenhouseLessons.findIndex(l=>!progress.completed.includes(l.id))
 return index<0?0:index
}
