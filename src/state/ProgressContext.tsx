import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { initialProgress, loadProgress, persistProgress } from '../lib/storage'
import { STORAGE_KEY, normalizeProgress } from '../lib/storage'
import { fetchProgress, syncProgress } from '../lib/progressApi'
import type { ProgressState } from '../types'
import { ProgressContext } from './useProgress'
import { AccountProvider } from './AccountProvider'
import { CloudProgressProvider } from './CloudProgressProvider'
import { useAccount } from './useAccount'
import type { ProgressContextValue } from './useProgress'

const browserOnly = import.meta.env.MODE === 'pages'

const localDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const previousDate = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return localDate(date)
}

function GuestProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(loadProgress)
  const [ready, setReady] = useState(browserOnly)
  const [storageStatus, setStorageStatus] = useState(browserOnly ? 'Сохранение в этом браузере' : 'Подключаем сохранение…')

  useEffect(() => {
    if (browserOnly) return
    let active = true
    fetchProgress().then(remote => {
      if (!active) return
      let localExists = true
      try { localExists = Boolean(localStorage.getItem(STORAGE_KEY)) } catch { /* Browser storage may be disabled. */ }
      if (!localExists && remote) setProgress(normalizeProgress(remote))
      setStorageStatus('SQL подключена')
    }).catch(() => { if (active) setStorageStatus('Только этот браузер · SQL недоступна') }).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    const localSaved = persistProgress(progress)
    if (browserOnly) {
      let active = true
      queueMicrotask(() => { if (active) setStorageStatus(localSaved ? 'Сохранено в этом браузере' : 'Не удалось сохранить · разреши хранение данных') })
      return () => { active = false }
    }
    const timer = window.setTimeout(() => {
      setStorageStatus('Сохраняем…')
      void syncProgress(progress).then(() => setStorageStatus('Сохранено в SQL')).catch(() => setStorageStatus(localSaved ? 'Сохранено в браузере · SQL недоступна' : 'Не удалось сохранить · разреши хранение данных'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [progress, ready])

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    storageStatus,
    completeMission: (missionId, xp) => {
      if (progress.completed.includes(missionId)) return false
      const today = localDate()
      const dayIndex = (new Date().getDay() + 6) % 7
      setProgress((current) => {
        if (current.completed.includes(missionId)) return current
        const activity = [...current.activity]
        activity[dayIndex] += 1
        return {
          ...current,
          xp: current.xp + xp,
          completed: [...current.completed, missionId],
          completedAt: { ...current.completedAt, [missionId]: new Date().toISOString() },
          activity,
          streak: current.lastCompletionDate === today
            ? current.streak
            : current.lastCompletionDate === previousDate() ? current.streak + 1 : 1,
          lastCompletionDate: today,
        }
      })
      return true
    },
    saveDraft: (missionId, code) => {
      setProgress((current) => ({
        ...current,
        drafts: { ...current.drafts, [missionId]: code },
      }))
    },
    setSound: (enabled) => setProgress((current) => ({ ...current, sound: enabled })),
    setMotion: (enabled) => setProgress((current) => ({ ...current, motion: enabled })),
    resetProgress: () => setProgress({ ...initialProgress, activity: [...initialProgress.activity] }),
  }), [progress, storageStatus])

  return <ProgressContext.Provider value={value}>{ready ? children : <div className="loading-screen" role="status">КОД:АРЕНА <span>Готовим твой учебный мир…</span></div>}</ProgressContext.Provider>
}

function ProgressRouter({children}:{children:ReactNode}) {
  const {ready,user,device}=useAccount()
  if(!ready)return <div className="loading-screen" role="status">Проверяем вход…</div>
  return user?<CloudProgressProvider key={user.id} userId={user.id}>{children}</CloudProgressProvider>:device?<CloudProgressProvider key={'device:'+device.id} userId={'device:'+device.id} device={device}>{children}</CloudProgressProvider>:<GuestProgressProvider key="guest">{children}</GuestProgressProvider>
}
export function ProgressProvider({children}:{children:ReactNode}) {
  return <AccountProvider><ProgressRouter>{children}</ProgressRouter></AccountProvider>
}
