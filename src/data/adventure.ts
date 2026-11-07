import data from './adventure-quests.json'
import type { PythonCheck } from './pythonCourse'
export interface IslandQuest {
  id: string; name: string; npc: string; role: string; x: number; z: number
  topic: string; lesson: number; xp: number; story: string; theory: string
  example: string; task: string; starter: string; solution: string; stdin: string
  checks: PythonCheck[]; reward: string; effect: string; hint: string
}
export const islandQuests: IslandQuest[] = data
export const islandProgressItems = islandQuests.map(q=>({id:q.id,xp:q.xp}))
