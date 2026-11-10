// Real hosted RPC, isolated browser contexts. No email requests or user sessions.
// Returns created profile IDs for precise QA cleanup, never the secret codes.
export default async function deviceChecks(page, base='http://127.0.0.1:5191/Learn_Code/') {
 const contexts=[], report={checks:[],errors:[],createdProfiles:[]}
 const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
 const empty=()=>({version:1,xp:0,completed:[],completedAt:{},drafts:{},activity:[0,0,0,0,0,0,0],streak:0,lastCompletionDate:null,sound:false,motion:false})
 async function device(seed=empty()){
  const c=await page.context().browser().newContext({viewport:{width:1440,height:1000}});contexts.push(c)
  await c.addInitScript(seed=>{if(!localStorage.getItem('qa-device-seeded')){localStorage.setItem('qa-device-seeded','1');localStorage.setItem('code-arena-progress-v1',JSON.stringify(seed))}},seed)
  const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);return {c,p}
 }
 const open=async p=>{await p.getByRole('button',{name:'Открыть аккаунт',exact:true}).click()}
 const close=async p=>{await p.getByRole('button',{name:'Закрыть аккаунт',exact:true}).click()}
 const saved=async p=>{await p.locator('.account-status').filter({hasText:'Сохранено в облаке'}).waitFor()}
 const cache=async p=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('learn-code-device-session-v1'));return s?JSON.parse(localStorage.getItem('code-arena:cloud:device:'+s.id)):null})
 const poll=async(p,predicate)=>{for(let i=0;i<80;i++){if(predicate(await cache(p)))return;await p.waitForTimeout(200)}throw Error('Timed out waiting for cloud state')}
 const connect=async(p,code)=>{await p.getByRole('button',{name:'Подключить синхронизацию',exact:true}).click();await p.getByLabel('Личный код с первого устройства').fill(code);await p.getByRole('button',{name:'Подключить по коду',exact:true}).click();await saved(p)}
 try {
  const seed={...empty(),completed:['lab-v1-grid-01'],completedAt:{'lab-v1-grid-01':new Date().toISOString()},drafts:{'python-v2-02':'captain = "Мира"'}}
  const a=await device(seed),b=await device()
  await a.p.getByRole('button',{name:'Подключить синхронизацию',exact:true}).click()
  await a.p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/device-sync-desktop.png'})
  await a.p.getByRole('button',{name:'Создать код и сохранить прогресс',exact:true}).click();await saved(a.p)
  const session=await a.p.evaluate(()=>JSON.parse(localStorage.getItem('learn-code-device-session-v1')))
  report.createdProfiles.push(session.id)
  check((await cache(a.p)).progress.completed.includes('lab-v1-grid-01'),'creation uploads existing guest achievements')
  check((await cache(a.p)).progress.drafts['python-v2-02']==='captain = "Мира"','creation uploads existing Python draft')
  check(await a.p.locator('#device-secret').getAttribute('type')==='password','secret hidden by default')
  check(!a.p.url().includes(session.code),'secret absent from URL')
  await b.p.getByRole('button',{name:'Подключить синхронизацию',exact:true}).click();await b.p.getByLabel('Личный код с первого устройства').fill('LC-short');await b.p.getByRole('button',{name:'Подключить по коду',exact:true}).click();await b.p.getByText('Вставь личный код целиком, начиная с LC-.',{exact:true}).waitFor();check(true,'malformed code explained')
  await b.p.getByLabel('Личный код с первого устройства').fill('LC-'+'0'.repeat(40));await b.p.getByRole('button',{name:'Подключить по коду',exact:true}).click();await b.p.getByText('Код не найден.',{exact:false}).waitFor();check(true,'unknown code rejected by real backend')
  await b.p.getByLabel('Личный код с первого устройства').fill(session.code.toLowerCase());await b.p.getByRole('button',{name:'Подключить по коду',exact:true}).click();await saved(b.p)
  check((await cache(b.p)).progress.completed.includes('lab-v1-grid-01'),'second device receives cloud achievements')
  check((await cache(b.p)).progress.xp===(await cache(a.p)).progress.xp,'XP matches on both devices')
  for(const d of [a,b]){await close(d.p);await d.p.getByRole('button',{name:'Мастерская',exact:true}).click();await d.p.getByRole('button',{name:'Другие мастерские',exact:true}).click()}
  const editor=p=>p.getByRole('textbox',{name:'Код мастерской'})
  await editor(a.p).fill('justify-content: center;');await poll(a.p,c=>c.row.state.drafts['lab-v1-flex-01']==='justify-content: center;')
  await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await poll(b.p,c=>c.progress.drafts['lab-v1-flex-01']==='justify-content: center;')
  check(await editor(b.p).inputValue()==='justify-content: center;','real cloud draft updates an open editor')
  await b.c.setOffline(true);await editor(b.p).fill('justify-content: flex-end;');await b.p.waitForTimeout(800)
  await editor(a.p).fill('justify-content: space-around;');await poll(a.p,c=>c.row.state.drafts['lab-v1-flex-01']==='justify-content: space-around;')
  await b.c.setOffline(false);await b.p.evaluate(()=>window.dispatchEvent(new Event('online')));await open(b.p);await b.p.locator('.draft-conflict').waitFor()
  check((await b.p.locator('.draft-conflict textarea').nth(0).inputValue()).includes('flex-end'),'offline conflicting draft preserved')
  check((await b.p.locator('.draft-conflict textarea').nth(1).inputValue()).includes('space-around'),'remote conflicting draft preserved')
  await b.p.getByRole('button',{name:'Оставить версию устройства',exact:true}).click();await saved(b.p)
  await a.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await poll(a.p,c=>c.progress.drafts['lab-v1-flex-01']==='justify-content: flex-end;');check(true,'conflict decision reaches first device')
  await close(b.p)
  for(const d of [a,b])await d.p.getByRole('button',{name:'Python · Мастерская механизмов',exact:true}).click()
  await a.p.getByRole('textbox',{name:'Python-код механизмов'}).fill('power = 3');await a.p.getByRole('button',{name:'Запустить устройства',exact:true}).click();await a.p.locator('.mechanism-verdict.is-passed').waitFor({timeout:60000})
  await poll(a.p,c=>c.row.state.completed.includes('mechanism-v1-light'))
  await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await poll(b.p,c=>c.progress.completed.includes('mechanism-v1-light'))
  check((await b.p.locator('.mechanism-progress').innerText()).includes('1 / 6'),'real solved Python game reaches second device')
  await b.p.reload();await b.p.getByRole('button',{name:'Открыть аккаунт',exact:true}).waitFor();await poll(b.p,c=>c.progress.completed.includes('mechanism-v1-light'));check(true,'connection and achievements survive reload')
  const c=await device();await c.p.getByRole('button',{name:'Подключить синхронизацию',exact:true}).click();await c.p.getByRole('button',{name:'Создать код и сохранить прогресс',exact:true}).click();await saved(c.p)
  report.createdProfiles.push(await c.p.evaluate(()=>JSON.parse(localStorage.getItem('learn-code-device-session-v1')).id))
  check((await cache(c.p)).progress.completed.length===0,'different personal code has isolated progress')
  await open(a.p);await a.p.getByRole('button',{name:'Выйти',exact:true}).click();await a.p.getByRole('button',{name:'Подключить синхронизацию',exact:true}).waitFor()
  check(await a.p.evaluate(()=>!JSON.parse(localStorage.getItem('code-arena-progress-v1')).completed.includes('mechanism-v1-light')),'sign-out preserves separate guest progress')
  await connect(a.p,session.code);check((await cache(a.p)).progress.completed.includes('mechanism-v1-light'),'personal code reconnects same cloud profile')
  await a.p.getByRole('button',{name:'Перенести гостевой прогресс',exact:true}).click();await saved(a.p)
  check((await cache(a.p)).progress.completed.filter(id=>id==='lab-v1-grid-01').length===1,'repeated guest import does not duplicate achievement')
  await b.p.setViewportSize({width:390,height:844});await open(b.p)
  check(await b.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile dialog fits viewport')
  await b.p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/device-sync-mobile.png'})
  check(report.errors.length===0,'no uncaught browser exceptions')
 } catch(e){report.failure=e.message}
 finally{for(const c of contexts)await c.close()}
 return report
}
