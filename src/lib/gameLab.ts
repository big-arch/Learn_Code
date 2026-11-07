import type { CSSProperties } from 'react'
import type { Point } from '../types'
import data from '../data/game-lab.json'

export type GameMode = 'flex' | 'grid' | 'select' | 'robot'
export interface LabLevel {
  id: string; mode: GameMode; title: string; brief: string; theory: string; hint: string; solution: string; xp: number
  count?: number; target?: CSSProperties; selected?: number[]; start?: Point; goal?: Point; steps?: number; loop?: boolean
}
export const labLevels = data as LabLevel[]
export const labModes: { id: GameMode; title: string; skill: string; symbol: string }[] = [
  { id: 'flex', title: 'Лодочная бухта', skill: 'CSS · Flexbox', symbol: '⛵' },
  { id: 'grid', title: 'Сад дождя', skill: 'CSS · Grid', symbol: '✿' },
  { id: 'select', title: 'Теплица', skill: 'HTML + CSS · селекторы', symbol: '❧' },
  { id: 'robot', title: 'Маршруты Искры', skill: 'Python · JS · C# · Go', symbol: '⌘' },
]
export { blocksToCode, labStyle, matchingRects } from './gameLabEngine'
export type { CommandBlock } from './gameLabEngine'
