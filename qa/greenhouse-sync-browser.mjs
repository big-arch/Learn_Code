export async function greenhouseSyncChecks(page,base='http://127.0.0.1:5191/Learn_Code/'){
 const contexts=[],report={checks:[],errors:[]},check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
 const empty=()=>({version:1,xp:0,completed:[],completedAt:{},drafts:{},activity:[0,0,0,0,0,0,0],streak:0,lastCompletionDate:null,sound:false,motion:true})
 let row={state:empty(),revision:0,epoch:0,accepted:true}
 async function device(){
  const c=await page.context().browser().newContext({viewport:{width:1440,height:1000}});contexts.push(c)
  await c.addInitScript(()=>{if(localStorage.getItem('qa-seeded'))return;localStorage.setItem('qa-seeded','yes');const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const payload=btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'}));localStorage.setItem('learn-code-auth',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.fixture',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))})
  await c.route('https://renbakjudvdnkjvjujti.supabase.co/**',async route=>{
   const req=route.request(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,x-supabase-api-version','access-control-allow-methods':'GET,POST,OPTIONS'}
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers})
   if(req.url().includes('/rpc/learn_code_sync')){const b=req.postDataJSON();if(b.p_state){if(b.p_revision!==row.revision)return route.fulfill({json:{...row,accepted:false},headers});row={state:b.p_reset?empty():b.p_state,revision:row.revision+1,epoch:row.epoch+(b.p_reset?1:0),accepted:true}}return route.fulfill({json:row,headers})}
   return route.fulfill({status:400,json:{message:'Unexpected QA request'},headers})
  })
  const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await p.getByRole('button',{name:'Открыть аккаунт',exact:true}).waitFor();return p
 }
 const select=async(p,i)=>{await p.getByRole('navigation',{name:'Занятия теплицы'}).getByRole('button').nth(i).click()}
 const sync=async p=>{await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForTimeout(900)}
 try{
  const a=await device(),b=await device()
  for(const p of [a,b]){await p.getByRole('button',{name:/02 Умная теплица/}).click();await select(p,1)}
  await a.getByRole('textbox',{name:'Python-код теплицы',exact:true}).fill('water = moisture < 35');await a.getByRole('button',{name:'Подсказка 1 из 3',exact:true}).click();await a.waitForTimeout(900);await sync(b)
  check(await b.getByRole('textbox',{name:'Python-код теплицы',exact:true}).inputValue()==='water = moisture < 35','draft reaches already open second device')
  check(await b.getByRole('button',{name:'Подсказка 2 из 3',exact:true}).isVisible(),'hint state refreshes in already open lesson')
  await a.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await a.locator('.green-verdict.is-passed').waitFor({timeout:60000});await a.waitForTimeout(900);await sync(b)
  check((await b.locator('.green-chapter-progress').innerText()).includes('1 из 8'),'chapter completion reaches second device')
  check(Object.values(row.state.learning).some(e=>e.kind==='attempt'&&e.passed&&e.helped),'cloud stores assisted attempt evidence')
  await b.getByRole('button',{name:'Повторить на новых данных',exact:true}).click();await b.getByRole('textbox',{name:'Python-код теплицы',exact:true}).fill('water = moisture < 45');await b.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await b.locator('.green-verdict.is-passed').waitFor({timeout:60000});await b.waitForTimeout(900);await sync(a)
  await a.getByRole('button',{name:'Прогресс',exact:true}).click();check((await a.locator('.green-skill-row').nth(1).innerText()).includes('Повторил на новых данных'),'independent review evidence reaches first device')
  check(row.state.xp===60,'cloud never awards duplicate review XP')
  await b.reload();await b.getByRole('button',{name:'Прогресс',exact:true}).click();check((await b.locator('.green-skill-row').nth(1).innerText()).includes('Повторил на новых данных'),'cloud evidence survives reload')
  await a.locator('.green-skill-row').nth(6).getByRole('button',{name:'К занятию',exact:true}).click();await a.getByRole('textbox',{name:'Python-код теплицы',exact:true}).fill('water = moisture < 35 and tank > 0\nfan = temperature > 28');await a.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await a.locator('.green-verdict.is-passed').waitFor({timeout:60000})
  const canvas=a.locator('.green-scene canvas');await canvas.scrollIntoViewIfNeeded();await a.waitForTimeout(200);const frame1=await canvas.screenshot();await a.waitForTimeout(250);const frame2=await canvas.screenshot();check(!frame1.equals(frame2),'water and fan animate after execution')
  await a.emulateMedia({reducedMotion:'reduce'});await a.waitForTimeout(250);const still1=await canvas.screenshot();await a.waitForTimeout(250);const still2=await canvas.screenshot();check(still1.equals(still2),'reduced-motion keeps scene still')
  const editor=a.getByRole('textbox',{name:'Python-код теплицы',exact:true});await editor.fill('pri');await editor.press('Control+Space');await a.getByRole('listbox',{name:'Подсказки кода'}).waitFor();check((await a.getByRole('listbox').innerText()).includes('print'),'autocomplete available in chapter editor');await editor.press('Escape');await editor.press('Tab');check(await editor.evaluate(e=>document.activeElement!==e),'keyboard can exit editor')
  const c=await page.context().browser().newContext({viewport:{width:390,height:844}});contexts.push(c);await c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args)}})
  const fallback=await c.newPage();await fallback.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await fallback.getByRole('button',{name:/02 Умная теплица/}).click();await fallback.getByText('Пульт теплицы',{exact:true}).waitFor();await fallback.getByRole('radio',{name:'True: полив нужен',exact:true}).check();await fallback.getByRole('button',{name:'Проверить прогноз',exact:true}).click();await fallback.locator('.green-verdict.is-passed').waitFor({timeout:60000});check(true,'Python exercise works without WebGL on mobile')
  check(report.errors.length===0,'no uncaught exceptions in sync and accessibility checks');return report
 }finally{for(const c of contexts)await c.close()}
}
