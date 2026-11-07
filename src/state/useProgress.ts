import { createContext, useContext } from 'react'
import type { ProgressState } from '../types'

export interface ProgressContextValue {
  progress: ProgressState
  storageStatus: string
  completeMission: (missionId: string, xp: number) => boolean
  saveDraft: (missionId: string, code: string) => void
  setSound: (enabled: boolean) => void
  setMotion: (enabled: boolean) => void
  resetProgress: () => void
}

export const ProgressContext = createContext<ProgressContextValue | null>(null)

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('useProgress must be used inside ProgressProvider')
  return context
}
