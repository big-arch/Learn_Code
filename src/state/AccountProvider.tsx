import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { AccountContext } from './useAccount'
export function AccountProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null)
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
  return <AccountContext.Provider value={{user,ready,configured:!!supabase,open,setOpen,authError}}>{children}</AccountContext.Provider>
}
