import { useEffect, useRef, useState } from 'react'
import { Cloud, LogIn, LogOut, Mail, RefreshCw, X } from 'lucide-react'
import { useAccount } from '../state/useAccount'
import { useProgress } from '../state/useProgress'
import { loadGuestForImport } from '../lib/storage'
import { supabase } from '../lib/supabaseClient'
import type { ProgressState } from '../types'
import './account.css'
function downloadBackup(progress:ProgressState) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download='learn-code-progress-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export function AccountDialog() {
  const {configured,open,setOpen,user,authError}=useAccount()
  const {progress,storageStatus,cloud}=useProgress()
  const dialog=useRef<HTMLDialogElement>(null)
  const [email,setEmail]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [cooldown,setCooldown]=useState(0)
  const [imported,setImported]=useState(false)
  const guest=loadGuestForImport()
  useEffect(()=>{const d=dialog.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open])
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(c=>c-1),1000);return()=>clearTimeout(timer)},[cooldown])
  if(!configured)return null
  async function sendLink(event:React.FormEvent) {
    event.preventDefault();if(busy||cooldown)return
    setBusy(true);setMessage('')
    try {
      const {error}=await supabase!.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:'https://big-arch.github.io/Learn_Code/',shouldCreateUser:true}})
      if(error)throw error
      setCooldown(60);setMessage('Письмо отправлено. Открой ссылку на устройстве, где хочешь продолжить обучение. Проверь также папку «Спам».')
    } catch(error) {
      const code=(error as {code?:string}).code
      const status=(error as {status?:number}).status??0
      setMessage(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'?'Слишком много запросов. Подожди немного и попробуй снова.':code==='email_address_not_authorized'?'Почтовый сервис пока не разрешает отправку на этот адрес. Сообщи владельцу сайта.':status>=500?'Сервис входа не смог отправить письмо. Владельцу сайта нужно проверить журнал отправки и настройки почтового сервиса. Пока можно продолжить обучение без входа.':'Не удалось отправить письмо. Проверь адрес и соединение, затем повтори.')
    } finally {setBusy(false)}
  }
  async function signOut() {
    setBusy(true)
    try {
      const {error}=await supabase!.auth.signOut({scope:'local'})
      if(error)throw error
      setOpen(false)
    } catch {setMessage('Не удалось завершить сеанс. Повтори попытку.')} finally {setBusy(false)}
  }
  return <dialog className="account-dialog" ref={dialog} aria-labelledby="account-title" onClose={()=>setOpen(false)}>
    <div className="dialog-topline"><span>ТВОЙ АККАУНТ</span><button type="button" className="icon-button" aria-label="Закрыть аккаунт" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <Cloud size={30}/><h2 id="account-title">{user?'Продолжай с любого устройства':'Твой прогресс — с тобой'}</h2>
    {user?<>
      <p className="account-email"><Mail size={17}/>{user.email}</p><p className="account-status" role="status">{storageStatus}</p>
      <p>Пройденные задания, XP и черновики доступны после входа на другом компьютере. Гостевое прохождение хранится отдельно.</p>
      <div className="account-actions"><button type="button" className="button primary" onClick={()=>cloud?.sync()}><RefreshCw size={17}/>Синхронизировать</button><button type="button" className="button secondary" disabled={busy} onClick={()=>void signOut()}><LogOut size={17}/>Выйти</button></div>
      <div className="account-import"><h3>Уже занимался без входа?</h3><p>В гостевом профиле этого браузера: {guest.completed.length} заданий, {guest.xp} XP. Можно добавить их в аккаунт. Повторные задания не увеличат XP.</p><button type="button" className="button secondary" disabled={imported || (!guest.completed.length&&!Object.keys(guest.drafts).length)} onClick={()=>{cloud?.importGuest();setImported(true)}}>{imported?'Прогресс добавлен':'Перенести гостевой прогресс'}</button></div>
      {Object.entries(cloud?.conflicts??{}).map(([id,c])=><section className="draft-conflict" key={id}><h3>Две версии черновика</h3><code>{id}</code><div><label>На этом устройстве<textarea readOnly value={c.local}/></label><label>В облаке<textarea readOnly value={c.remote}/></label></div><button type="button" className="button secondary" onClick={()=>cloud?.resolve(id,'local')}>Оставить версию устройства</button><button type="button" className="button secondary" onClick={()=>cloud?.resolve(id,'remote')}>Оставить облачную версию</button></section>)}
      {cloud?.backup&&<button type="button" className="text-link" onClick={()=>downloadBackup(cloud.backup!)}>Скачать резервную копию до сброса</button>}
      <button type="button" className="text-link" onClick={()=>downloadBackup(progress)}>Скачать копию прогресса аккаунта</button>
    </>:<>
      <p>Введи почту — пришлём ссылку для входа. Пароль не нужен. На другом компьютере войди с той же почтой.</p>
      <form onSubmit={e=>void sendLink(e)}><label htmlFor="account-email">Твоя почта</label><input id="account-email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/><button type="submit" className="button primary" disabled={busy||cooldown>0}><LogIn size={17}/>{busy?'Отправляем…':cooldown>0?`Повторить через ${cooldown} с`:'Получить ссылку для входа'}</button></form>
      <small>После входа можно перенести гостевой прогресс этого браузера в аккаунт.</small>
    </>}
    {(message||authError)&&<p className="account-message" role="status">{message||authError}</p>}
  </dialog>
}
