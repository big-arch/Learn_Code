// Two isolated browsers use the real account/progress UI and a mocked Supabase RPC.
// No user accounts, emails or production rows are created by this check.
export async function pythonSyncChecks(page, lessons, base='http://127.0.0.1:5191/Learn_Code/') {
  const contexts=[],report={checks:[],errors:[]},check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  const empty=()=>({version:1,xp:0,completed:[],completedAt:{},drafts:{},activity:[0,0,0,0,0,0,0],streak:0,lastCompletionDate:null,sound:false,motion:true})
  let row={state:empty(),revision:0,epoch:0,accepted:true}
  async function device() {
    const c=await page.context().browser().newContext({viewport:{width:1440,height:1000}});contexts.push(c)
    await c.addInitScript(()=>{
      if(localStorage.getItem('qa-seeded'))return
      localStorage.setItem('qa-seeded','yes')
      const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}
      const payload=btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'}))
      localStorage.setItem('learn-code-auth',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.fixture',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))
    })
    await c.route('https://renbakjudvdnkjvjujti.supabase.co/**',async route=>{
      const req=route.request(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,x-supabase-api-version','access-control-allow-methods':'GET,POST,OPTIONS'}
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers})
      if(req.url().includes('/rpc/learn_code_sync')){
        const b=req.postDataJSON()
        if(b.p_state){if(b.p_revision!==row.revision)return route.fulfill({json:{...row,accepted:false},headers});row={state:b.p_reset?empty():b.p_state,revision:row.revision+1,epoch:row.epoch+(b.p_reset?1:0),accepted:true}}
        return route.fulfill({json:row,headers})
      }
      return route.fulfill({status:400,json:{message:'Unexpected QA request'},headers})
    })
    const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message))
    await p.goto(base,{waitUntil:'commit'});await p.getByRole('button',{name:'Открыть аккаунт',exact:true}).waitFor()
    await p.getByRole('button',{name:'Начать с нуля',exact:true}).click();return p
  }
  const sync=async p=>{await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForTimeout(900)}
  const select=async(p,i)=>p.locator('.syllabus section button').nth(i).click()
  const answer=async(p,i)=>{await p.getByRole('tab',{name:/Проверить себя/}).click();await p.getByRole('radio').nth(lessons[i].quiz.correct).check();await p.getByRole('button',{name:'Проверить ответ',exact:true}).click()}
  const run=async(p,i)=>{await p.getByRole('tab',{name:/Написать код/}).click();await p.getByRole('textbox',{name:'Код решения',exact:true}).fill(lessons[i].solution);await p.getByRole('button',{name:'Запустить код',exact:true}).click();await p.locator('.python-checks .passed').first().waitFor({timeout:60000});await p.waitForTimeout(900)}
  try {
    const a=await device(),b=await device()
    await answer(a,0);await sync(a);await sync(b)
    check(row.state.completed.includes(lessons[0].id+'-quiz')&&!row.state.completed.includes(lessons[0].id),'quiz saved before the practice on another device')
    await run(b,0);await sync(a)
    for(const p of [a,b])await p.locator('.syllabus section button.is-complete').first().waitFor()
    check(row.state.xp===lessons[0].xp+10,'cross-device quiz and code produce exactly one completion reward')
    check(Object.values(row.state.learning).some(e=>e.lesson===lessons[0].id&&e.passed),'cloud payload retains Python practice evidence')
    for(const p of [a,b])await select(p,1)
    await run(b,1);await sync(a);await a.getByRole('tab',{name:/Написать код/}).click()
    check(await a.getByRole('textbox',{name:'Код решения',exact:true}).inputValue()===lessons[1].solution,'successful draft appears on the other device')
    check(await a.getByText('Практика зачтена и сохранена.',{exact:false}).isVisible(),'saved practice appears on the other device')
    await answer(a,1);await sync(a);await sync(b)
    check(await b.locator('.syllabus section button.is-complete').count()===2,'new completion check and green style reach the already-open device')
    await run(b,1);await sync(a)
    check(row.state.xp===lessons[0].xp+lessons[1].xp+20,'replay and merged completions never double XP')
    await b.reload({waitUntil:'commit'});await b.locator('.side-nav').getByRole('button',{name:'Курс Python',exact:true}).click()
    check(await b.locator('.syllabus section button.is-complete').count()===2,'completed styling survives an account reload')
    check(report.errors.length===0,'no browser exceptions');return report
  } finally {for(const c of contexts)await c.close()}
}
