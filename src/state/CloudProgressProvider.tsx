import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CloudProgressStore } from '../lib/cloudProgress'
import { loadGuestForImport } from '../lib/storage'
import { ProgressContext } from './useProgress'
import type { ProgressContextValue } from './useProgress'
import { deviceSync } from '../lib/deviceSync'
import { readDeviceSession } from '../lib/deviceCode'
import type { DeviceSession } from '../lib/deviceCode'
const dayKey=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
export function CloudProgressProvider({userId,device,children}:{userId:string;device?:DeviceSession;children:ReactNode}) {
  const store=useMemo(()=>new CloudProgressStore(userId,async(revision,state,reset)=>{
    if(device){
      if(readDeviceSession()?.id!==device.id)throw Error('Account changed')
      return deviceSync(device.code,revision,state,reset)
    }
    const {data:{session}}=await supabase!.auth.getSession()
    if(session?.user.id!==userId)throw Error('Account changed')
    const {data,error}=await supabase!.rpc('learn_code_sync',{p_revision:revision??null,p_state:state??null,p_reset:reset??false}).abortSignal(AbortSignal.timeout(12000))
    if(error)throw error
    return data
  },localStorage,device?.initial),[userId,device])
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot)
  useEffect(()=>{
    store.start()
    const sync=()=>void store.sync()
    const visible=()=>{if(document.visibilityState==='visible')sync()}
    window.addEventListener('online',sync);window.addEventListener('focus',sync)
    document.addEventListener('visibilitychange',visible)
    const interval=window.setInterval(()=>{if(document.visibilityState==='visible')sync()},30000)
    return()=>{store.dispose();clearInterval(interval);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',visible)}
  },[store])
  const value:ProgressContextValue={
    progress:snapshot.progress,storageStatus:snapshot.status,
    cloud:{conflicts:snapshot.conflicts,backup:snapshot.backup,sync:()=>void store.sync(),importGuest:()=>store.importGuest(loadGuestForImport()),resolve:store.resolve},
    completeMission:(id,xp)=>{
      if(snapshot.progress.completed.includes(id))return false
      store.change(current=>{
        if(current.completed.includes(id))return current
        const today=dayKey(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1)
        const activity=[...current.activity];activity[(new Date().getDay()+6)%7]++
        return {...current,xp:current.xp+xp,completed:[...current.completed,id],completedAt:{...current.completedAt,[id]:new Date().toISOString()},activity,streak:current.lastCompletionDate===today?current.streak:current.lastCompletionDate===dayKey(yesterday)?current.streak+1:1,lastCompletionDate:today}
      });return true
    },
    saveDraft:(id,code)=>{if(snapshot.progress.drafts[id]!==code)store.change(p=>({...p,drafts:{...p.drafts,[id]:code}}))},
    setSound:enabled=>store.change(p=>({...p,sound:enabled})),setMotion:enabled=>store.change(p=>({...p,motion:enabled})),
    resetProgress:()=>{void store.reset().catch(e=>store.report(e.message))},
  }
  return <ProgressContext.Provider value={value}>{snapshot.ready?children:<div className="loading-screen" role="status">Загружаем прогресс аккаунта…</div>}</ProgressContext.Provider>
}
