export default async function accountChecks(page) {
  const browser=page.context().browser(),contexts=[]
  const report={checks:[],errors:[]}; const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  const empty=()=>({version:1,xp:0,completed:[],completedAt:{},drafts:{},activity:[0,0,0,0,0,0,0],streak:0,lastCompletionDate:null,sound:false,motion:false})
  let row={state:empty(),revision:0,epoch:0,accepted:true}
  async function device(signedIn=true) {
    const ctx=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(ctx)
    let offline=false
    await ctx.addInitScript(({signedIn,guest})=>{
      if(!localStorage.getItem('qa-seeded')) {
        localStorage.setItem('qa-seeded','yes');localStorage.setItem('code-arena-progress-v1',JSON.stringify(guest))
        if(signedIn){const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const payload=btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'}));localStorage.setItem('learn-code-auth',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.fixture',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))}
      }
    },{signedIn,guest:{...empty(),completed:['lab-v1-grid-01'],completedAt:{'lab-v1-grid-01':new Date().toISOString()}}})
    await ctx.route('https://renbakjudvdnkjvjujti.supabase.co/**',async route=>{
      const req=route.request(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,x-supabase-api-version','access-control-allow-methods':'GET,POST,OPTIONS'}
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers})
      if(req.url().includes('/rpc/learn_code_sync')) {
        if(offline)return route.abort()
        const body=req.postDataJSON()
        if(body.p_state){if(body.p_revision!==row.revision)return route.fulfill({json:{...row,accepted:false},headers});row={state:body.p_reset?empty():body.p_state,revision:row.revision+1,epoch:row.epoch+(body.p_reset?1:0),accepted:true}}
        return route.fulfill({json:row,headers})
      }
      if(req.url().includes('/logout'))return route.fulfill({status:204,headers})
      if(req.url().includes('/otp'))return route.fulfill({json:{},headers})
      return route.fulfill({status:400,json:{message:'Unexpected test request'},headers})
    })
    const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:5191/Learn_Code/')
    return {p,setOffline:v=>offline=v}
  }
  try {
    const a=await device(),b=await device()
    await a.p.getByRole('button',{name:'Открыть аккаунт',exact:true}).click()
    await a.p.getByRole('button',{name:'Перенести гостевой прогресс',exact:true}).click();await a.p.waitForTimeout(100)
    check(row.state.completed.includes('lab-v1-grid-01'),'guest achievements imported into account')
    await a.p.getByRole('button',{name:'Закрыть аккаунт',exact:true}).click()
    for(const d of [a,b]){await d.p.getByRole('button',{name:'Мастерская',exact:true}).click();await d.p.getByRole('button',{name:'Другие мастерские',exact:true}).click()}
    const editor=d=>d.p.getByRole('textbox',{name:'Код мастерской'})
    await editor(a).fill('justify-content: center;');await a.p.waitForTimeout(900)
    await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await b.p.waitForTimeout(300)
    check(await editor(b).inputValue()==='justify-content: center;','remote draft updates an already open editor')
    b.setOffline(true);await editor(b).fill('justify-content: flex-end;');await b.p.waitForTimeout(900)
    await editor(a).fill('justify-content: space-around;');await a.p.waitForTimeout(900)
    b.setOffline(false);await b.p.evaluate(()=>window.dispatchEvent(new Event('online')));await b.p.waitForTimeout(300)
    await b.p.getByRole('button',{name:'Открыть аккаунт',exact:true}).click();await b.p.locator('.draft-conflict').waitFor()
    check((await b.p.locator('.draft-conflict textarea').nth(0).inputValue()).includes('flex-end'),'local conflicting draft preserved')
    check((await b.p.locator('.draft-conflict textarea').nth(1).inputValue()).includes('space-around'),'remote conflicting draft displayed')
    await b.p.getByRole('button',{name:'Оставить версию устройства',exact:true}).click();await b.p.waitForTimeout(200)
    check(row.state.drafts['lab-v1-flex-01']==='justify-content: flex-end;','chosen draft saved')
    await a.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await a.p.waitForTimeout(250)
    check(await editor(a).inputValue()==='justify-content: flex-end;','chosen draft reaches second device')
    await b.p.getByRole('button',{name:'Закрыть аккаунт',exact:true}).click()
    for(const d of [a,b])await d.p.getByRole('button',{name:'Python · Мастерская механизмов',exact:true}).click()
    await a.p.getByRole('textbox',{name:'Python-код механизмов'}).fill('power = 3');await a.p.waitForTimeout(900)
    await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await b.p.waitForTimeout(300)
    check(await b.p.getByRole('textbox',{name:'Python-код механизмов'}).inputValue()==='power = 3','mechanism draft reaches another open device')
    await a.p.getByRole('button',{name:'Запустить устройства',exact:true}).click();await a.p.locator('.mechanism-verdict.is-passed').waitFor({timeout:60000});await a.p.waitForTimeout(900)
    await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));await b.p.waitForTimeout(300)
    check((await b.p.locator('.mechanism-progress').innerText()).includes('1 / 6'),'mechanism achievement syncs between mocked signed-in devices')
    await b.p.getByRole('button',{name:'Открыть аккаунт',exact:true}).click()
    await b.p.getByRole('button',{name:'Выйти',exact:true}).click();await b.p.getByRole('button',{name:'Войти по почте',exact:true}).waitFor()
    await b.p.getByRole('button',{name:'Мастерская',exact:true}).click();await b.p.getByRole('button',{name:'Другие мастерские',exact:true}).click()
    check(await editor(b).inputValue()==='','sign-out returns separate guest draft')
    const guest=await device(false);await guest.p.getByRole('button',{name:'Войти по почте',exact:true}).click()
    await guest.p.getByLabel('Твоя почта').fill('qa@example.invalid');await guest.p.getByRole('button',{name:'Получить ссылку для входа',exact:true}).click()
    await guest.p.getByText('Письмо отправлено.',{exact:false}).waitFor()
    check(await guest.p.getByRole('button',{name:/Повторить через/}).isDisabled(),'email request feedback and cooldown')
    await guest.p.setViewportSize({width:390,height:844});check(await guest.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile account dialog fits')
    check(report.errors.length===0,'no browser exceptions')
    return report
  } finally {for(const ctx of contexts)await ctx.close()}
}
