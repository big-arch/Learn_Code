import type { ProgressState } from '../types'
import { allMissions } from '../data/lessons'
import { pythonProgressItems } from '../data/pythonCourse'
import { islandProgressItems } from '../data/adventure'
import videoData from '../data/python-video.json'
import labLevels from '../data/game-lab.json'
import mechanismMissions from '../data/mechanism-missions.json'
const progressItems = [...allMissions, ...pythonProgressItems, ...islandProgressItems, ...labLevels, ...mechanismMissions]

export const STORAGE_KEY = 'code-arena-progress-v1'

export const initialProgress: ProgressState = {
  version: 1,
  xp: 0,
  completed: [],
  completedAt: {},
  drafts: {},
  activity: [0, 0, 0, 0, 0, 0, 0],
  streak: 0,
  lastCompletionDate: null,
  sound: true,
  motion: true,
}

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}

export function loadProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialProgress
    return normalizeProgress(JSON.parse(raw))
  } catch { return initialProgress }
}

export function normalizeProgress(input: unknown): ProgressState {
  try {
    const value = input as Partial<ProgressState>
    if (value.version !== 1) return initialProgress
    const completed = [...new Set(Array.isArray(value.completed) ? value.completed.filter(id => progressItems.some(m => m.id === id)) : [])]
    const completedAt = isStringRecord(value.completedAt) ? value.completedAt : {}
    const today = new Date()
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
    const activity = [0, 0, 0, 0, 0, 0, 0]
    for (const id of completed) {
      const date = new Date(completedAt[id])
      if (date >= monday && date <= today) activity[(date.getDay() + 6) % 7]++
    }
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const dateKey = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
    const currentStreak = value.lastCompletionDate === dateKey(today) || value.lastCompletionDate === dateKey(yesterday)

    return {
      version: 1,
      xp: progressItems.filter(m => completed.includes(m.id)).reduce((sum, m) => sum + m.xp, 0),
      completed,
      completedAt,
      drafts: isStringRecord(value.drafts) ? value.drafts : {},
      activity,
      streak: currentStreak && typeof value.streak === 'number' && Number.isFinite(value.streak) ? Math.max(0, Math.floor(value.streak)) : 0,
      lastCompletionDate: typeof value.lastCompletionDate === 'string' ? value.lastCompletionDate : null,
      sound: typeof value.sound === 'boolean' ? value.sound : true,
      motion: typeof value.motion === 'boolean' ? value.motion : true,
    }
  } catch {
    return initialProgress
  }
}

export function persistProgress(state: ProgressState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadGuestForImport(): ProgressState {
  const guest=loadProgress(),drafts={...guest.drafts}
  try { for(const lab of videoData.labs) {const code=localStorage.getItem('code-arena:video-draft:'+lab.id);if(code!==null&&code.length<=20000)drafts['video-'+lab.id]=code} } catch { /* Existing browser draft remains intact. */ }
  return {...guest,drafts}
}
