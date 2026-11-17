const isRecord=v=>v&&typeof v==='object'&&!Array.isArray(v)
const validEvent=(id,e)=>/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)&&isRecord(e)&&/^(greenhouse-v1-0[1-8]|python-v2-(0[1-9]|1[0-9]|2[0-4]))$/.test(e.lesson)&&Number.isInteger(e.version)&&e.version>=1&&e.version<=100&&['visit','hint','attempt'].includes(e.kind)&&['lesson','review'].includes(e.variant)&&typeof e.passed==='boolean'&&typeof e.helped==='boolean'&&typeof e.at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e.at)&&Number.isFinite(Date.parse(e.at))
export function normalizeEvidence(input){
 if(!isRecord(input))return {}
 const entries=Object.entries(input).filter(([id,e])=>validEvent(id,e)).sort(([a,x],[b,y])=>y.at.localeCompare(x.at)||b.localeCompare(a)),groups=new Map()
 for(const entry of entries){const lesson=entry[1].lesson;if(!groups.has(lesson))groups.set(lesson,[]);groups.get(lesson).push(entry)}
 const keep=new Set()
 for(const group of groups.values()){
  const selected=new Set(),buckets=new Map()
  // Preserve evidence of success and used hints even after many page visits.
  for(const [id,e] of group){const bucket=e.kind==='attempt'&&e.passed?`pass:${e.variant}:${e.helped}`:e.kind==='hint'?`hint:${e.variant}`:e.kind==='visit'?`visit:${e.variant}`:'attempt';const limit=e.kind==='hint'?3:1,n=buckets.get(bucket)||0;if(n<limit){selected.add(id);buckets.set(bucket,n+1)}}
  for(const [id] of group){if(selected.size>=16)break;selected.add(id)}
  for(const id of selected)keep.add(id)
 }
 return Object.fromEntries(entries.filter(([id])=>keep.has(id)).slice(0,512).map(([id,e])=>[id,{lesson:e.lesson,version:e.version,kind:e.kind,variant:e.variant,passed:e.passed,helped:e.helped,at:e.at}]))
}
export function validEvidence(input){return input===undefined||(isRecord(input)&&Object.keys(input).length<=512&&Object.entries(input).every(([id,e])=>validEvent(id,e)))}
export function mergeEvidence(a,b){
 const result={...normalizeEvidence(a)}
 for(const [id,event] of Object.entries(normalizeEvidence(b))){const old=result[id];if(!old||JSON.stringify(event)>JSON.stringify(old))result[id]=event}
 return normalizeEvidence(result)
}
