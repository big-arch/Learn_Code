import { useEffect, useRef, useState } from 'react'
import { Cloud, Copy, KeyRound, LogIn, LogOut, Mail, RefreshCw, X } from 'lucide-react'
import { useAccount } from '../state/useAccount'
import { useProgress } from '../state/useProgress'
import { loadGuestForImport } from '../lib/storage'
import { supabase } from '../lib/supabaseClient'
import type { ProgressState } from '../types'
import { createDeviceCode, normalizeDeviceCode, PENDING_DEVICE_KEY } from '../lib/deviceCode'
import { deviceSync } from '../lib/deviceSync'
import './account.css'
function downloadBackup(progress:ProgressState) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download='learn-code-progress-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export function AccountDialog() {
  const {configured,open,setOpen,user,device,setDevice,authError}=useAccount()
  const {progress,storageStatus,cloud}=useProgress()
  const dialog=useRef<HTMLDialogElement>(null)
  const [email,setEmail]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [cooldown,setCooldown]=useState(0)
  const [imported,setImported]=useState(false)
  const [method,setMethod]=useState<'code'|'email'>('code')
  const [inputCode,setInputCode]=useState('')
  const [reveal,setReveal]=useState(false)
  const connected=!!(user||device)
  const guest=loadGuestForImport()
  useEffect(()=>{const d=dialog.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open])
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(c=>c-1),1000);return()=>clearTimeout(timer)},[cooldown])
  if(!configured)return null
  async function connectCode(create:boolean) {
    if(busy)return
    setBusy(true);setMessage('')
    try {
      let code=normalizeDeviceCode(inputCode)
      if(create){
        code=normalizeDeviceCode(localStorage.getItem(PENDING_DEVICE_KEY)||'')||createDeviceCode()
        // Retain the code before sending so a lost response can be retried safely.
        localStorage.setItem(PENDING_DEVICE_KEY,code)
      }
      if(!code)throw Error('Вставь личный код целиком, начиная с LC-.')
      const result=await deviceSync(code,undefined,create?progress:undefined,false,create)
      setDevice({id:result.id,code,...(create?{initial:progress}:{})})
      localStorage.removeItem(PENDING_DEVICE_KEY)
    } catch(error){setMessage(error instanceof Error?error.message:'Не удалось подключиться. Повтори попытку.')}
    finally{setBusy(false)}
  }
  async function copyCode() {
    try{await navigator.clipboard.writeText(device!.code);setMessage('Код скопирован. На втором устройстве открой «Войти» и вставь его в поле личного кода.')}
    catch{setReveal(true);setMessage('Выдели и скопируй код вручную.')}
  }
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
      if(user){const {error}=await supabase!.auth.signOut({scope:'local'});if(error)throw error}
      setOpen(false)
      setDevice(null)
    } catch {setMessage('Не удалось завершить сеанс. Повтори попытку.')} finally {setBusy(false)}
  }
  return <dialog className="account-dialog" ref={dialog} aria-labelledby="account-title" onClose={()=>setOpen(false)}>
    <div className="dialog-topline"><span>ТВОЙ АККАУНТ</span><button type="button" className="icon-button" aria-label="Закрыть аккаунт" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <Cloud size={30}/><h2 id="account-title">{connected?'Продолжай с любого устройства':'Твой прогресс с тобой'}</h2>
    {connected?<>
      <p className="account-email">{user?<><Mail size={17}/>{user.email}</>:<><KeyRound size={17}/>Подключено по личному коду</>}</p><p className="account-status" role="status">{storageStatus}</p>
      <p>Пройденные задания, XP и черновики доступны после входа на другом компьютере. Гостевое прохождение хранится отдельно.</p>
      {!user&&device&&<section className="device-code-panel"><h3>Подключи другое устройство</h3><ol><li>Скопируй свой личный код.</li><li>Открой этот сайт на другом устройстве.</li><li>Нажми «Войти» и «Подключить по коду».</li></ol><label htmlFor="device-secret">Личный код</label><input id="device-secret" className="device-secret" type={reveal?'text':'password'} value={device.code} readOnly autoComplete="off" onFocus={e=>e.target.select()}/><div className="account-actions"><button type="button" className="button primary" onClick={()=>void copyCode()}><Copy size={17}/>Скопировать код</button><button type="button" className="button secondary" aria-pressed={reveal} onClick={()=>setReveal(!reveal)}>{reveal?'Скрыть код':'Показать код'}</button></div><small>Сохрани код у себя: он даёт доступ к прогрессу. Если потерять код и выйти на всех устройствах, восстановить этот профиль не получится.</small></section>}
      <div className="account-actions"><button type="button" className="button primary" onClick={()=>cloud?.sync()}><RefreshCw size={17}/>Синхронизировать</button><button type="button" className="button secondary" disabled={busy} onClick={()=>void signOut()}><LogOut size={17}/>Выйти</button></div>
      <div className="account-import"><h3>Уже занимался без входа?</h3><p>В гостевом профиле этого браузера: {guest.completed.length} заданий, {guest.xp} XP. Можно добавить их в аккаунт. Повторные задания не увеличат XP.</p><button type="button" className="button secondary" disabled={imported || (!guest.completed.length&&!Object.keys(guest.drafts).length)} onClick={()=>{cloud?.importGuest();setImported(true)}}>{imported?'Прогресс добавлен':'Перенести гостевой прогресс'}</button></div>
      {Object.entries(cloud?.conflicts??{}).map(([id,c])=><section className="draft-conflict" key={id}><h3>Две версии черновика</h3><code>{id}</code><div><label>На этом устройстве<textarea readOnly value={c.local}/></label><label>В облаке<textarea readOnly value={c.remote}/></label></div><button type="button" className="button secondary" onClick={()=>cloud?.resolve(id,'local')}>Оставить версию устройства</button><button type="button" className="button secondary" onClick={()=>cloud?.resolve(id,'remote')}>Оставить облачную версию</button></section>)}
      {cloud?.backup&&<button type="button" className="text-link" onClick={()=>downloadBackup(cloud.backup!)}>Скачать резервную копию до сброса</button>}
      <button type="button" className="text-link" onClick={()=>downloadBackup(progress)}>Скачать копию прогресса аккаунта</button>
    </>:<>
      <div className="account-methods" aria-label="Способ подключения"><button type="button" aria-pressed={method==='code'} onClick={()=>{setMethod('code');setMessage('')}}>По личному коду</button><button type="button" aria-pressed={method==='email'} onClick={()=>{setMethod('email');setMessage('')}}>По почте</button></div>
      {method==='code'?<>
        <p>Один личный код связывает твои устройства. Уроки, игры и написанный код сохраняются автоматически.</p>
        <section className="device-create"><h3>Первое устройство</h3><p>Сохраним текущее прохождение: {progress.completed.length} заданий и {progress.xp} XP, вместе с черновиками.</p><button type="button" className="button primary" disabled={busy} onClick={()=>void connectCode(true)}><Cloud size={18}/>{busy?'Подключаем…':'Создать код и сохранить прогресс'}</button></section>
        <form className="device-connect" onSubmit={e=>{e.preventDefault();void connectCode(false)}}><h3>У меня уже есть код</h3><label htmlFor="device-code">Личный код с первого устройства</label><input id="device-code" type="password" value={inputCode} autoComplete="off" spellCheck={false} maxLength={100} required placeholder="LC-…" onChange={e=>setInputCode(e.target.value)} disabled={busy}/><button type="submit" className="button secondary" disabled={busy}><KeyRound size={17}/>Подключить по коду</button><small>Загрузим облачный профиль. Гостевые результаты этого устройства можно добавить после подключения.</small></form>
      </>:<>
      <p>Введи почту — пришлём ссылку для входа. Пароль не нужен. На другом компьютере войди с той же почтой.</p>
      <small>Почта открывает отдельный профиль. Если ты уже подключался по личному коду, используй этот код на другом устройстве.</small>
      <form onSubmit={e=>void sendLink(e)}><label htmlFor="account-email">Твоя почта</label><input id="account-email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/><button type="submit" className="button primary" disabled={busy||cooldown>0}><LogIn size={17}/>{busy?'Отправляем…':cooldown>0?`Повторить через ${cooldown} с`:'Получить ссылку для входа'}</button></form>
      <small>После входа можно перенести гостевой прогресс этого браузера в аккаунт.</small>
      </>}
    </>}
    {(message||authError)&&<p className="account-message" role="status">{message||authError}</p>}
  </dialog>
}
