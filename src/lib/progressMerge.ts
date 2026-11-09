import type { ProgressState } from '../types'

export interface DraftConflict { local: string; remote: string }
export function mergeProgress(base: ProgressState, local: ProgressState, remote: ProgressState) {
  const completed = [...new Set([...remote.completed, ...local.completed])]
  const completedAt = {...remote.completedAt}
  for (const id of completed) {
    const a = local.completedAt[id], b = completedAt[id]
    if (a && (!b || a < b)) completedAt[id] = a
  }
  const drafts = {...remote.drafts}
  const conflicts: Record<string, DraftConflict> = {}
  for (const id of Object.keys(local.drafts)) {
    const before = base.drafts[id] ?? '', mine = local.drafts[id], theirs = remote.drafts[id] ?? ''
    if (mine === before) continue
    if (theirs !== before && theirs !== mine) conflicts[id] = {local:mine, remote:theirs}
    else drafts[id] = mine
  }
  const dates = [...new Set(Object.values(completedAt).filter(d => Number.isFinite(Date.parse(d))).map(d => {
    const date = new Date(d)
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
  }))].sort()
  let streak = dates.length ? 1 : 0
  for (let i=dates.length-1;i>0;i--) {
    const a=new Date(dates[i]+'T12:00:00'), b=new Date(dates[i-1]+'T12:00:00')
    a.setDate(a.getDate()-1)
    if(a.getTime()!==b.getTime()) break
    streak++
  }
  return {state: {...remote, completed, completedAt, drafts, streak, lastCompletionDate:dates.at(-1) ?? null,
    sound:local.sound!==base.sound?local.sound:remote.sound,
    motion:local.motion!==base.motion?local.motion:remote.motion}, conflicts}
}

export function sameProgress(a: ProgressState, b: ProgressState) {
  const canonical = (p: ProgressState) => JSON.stringify({
    completed:[...p.completed].sort(), completedAt:Object.entries(p.completedAt).sort(),
    drafts:Object.entries(p.drafts).sort(), sound:p.sound, motion:p.motion,
  })
  return canonical(a) === canonical(b)
}
