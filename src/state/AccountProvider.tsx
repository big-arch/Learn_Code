import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { AccountContext } from './useAccount'
import { DEVICE_SESSION_KEY, readDeviceSession } from '../lib/deviceCode'
import type { DeviceSession } from '../lib/deviceCode'
export function AccountProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null)
  const [device,updateDevice]=useState(readDeviceSession)
  const setDevice=(next:DeviceSession|null)=>{
    if(next)localStorage.setItem(DEVICE_SESSION_KEY,JSON.stringify({id:next.id,code:next.code}))
    else localStorage.removeItem(DEVICE_SESSION_KEY)
    updateDevice(next)
  }
  useEffect(()=>{
    const changed=(event:StorageEvent)=>{if(event.key===DEVICE_SESSION_KEY || event.key===null)updateDevice(readDeviceSession())}
    window.addEventListener('storage',changed)
    return()=>window.removeEventListener('storage',changed)
  },[])
  const [ready,setReady]=useState(!supabase)
  const [open,setOpen]=useState(()=>/access_token=|error=/.test(window.location.hash))
  const [authError,setAuthError]=useState(()=>window.location.hash.includes('error=')?'Ссылка недействительна или истекла. Запроси новое письмо.':'')
  useEffect(()=>{
    if(!supabase)return
    let active=true,events=0
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      events++
      if(active){setUser(session?.user??null);setReady(true)}
    })
    void supabase.auth.getSession().then(({data,error})=>{
      if(!active)return
      if(error)setAuthError('Не удалось восстановить вход. Можно запросить новое письмо.')
      if(events===0)setUser(data.session?.user??null)
      setReady(true)
    }).catch(()=>{if(active){setReady(true);setAuthError('Сервис входа временно недоступен. Гостевой прогресс сохранён.')}})
    return()=>{active=false;subscription.unsubscribe()}
  },[])
  return <AccountContext.Provider value={{user,device,setDevice,ready,configured:!!supabase,open,setOpen,authError}}>{children}</AccountContext.Provider>
}
