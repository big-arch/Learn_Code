export default async function practiceChecks(page,lessons,origin='http://127.0.0.1:5191/Learn_Code/') {
  const ctx=await page.context().browser().newContext({viewport:{width:1680,height:1050},reducedMotion:'reduce',acceptDownloads:true})
  const p=await ctx.newPage(),report={checks:[],errors:[]};p.setDefaultTimeout(18000);p.on('pageerror',e=>report.errors.push(e.message))
  const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')))
  const run=async()=>{await p.getByRole('button',{name:/^(Запустить и проверить|Проверить страницу)$/}).click();await p.locator('.practice-verdict').waitFor({timeout:65000})}
  const route=()=>p.getByRole('navigation',{name:'Маршрут практикума'}).getByRole('button')
  const openWeb=async()=>{await p.locator('.practice-track-switch button').nth(1).click()}
  const setWeb=async(html,css)=>{await p.getByRole('button',{name:'index.html',exact:true}).click();await p.getByRole('textbox',{name:'Код практикума HTML'}).fill(html);await p.getByRole('button',{name:'style.css',exact:true}).click();await p.getByRole('textbox',{name:'Код практикума CSS'}).fill(css)}
  try {
    await p.goto(origin);await p.getByRole('button',{name:'Практикум',exact:true}).click()
    const editor=p.getByRole('textbox',{name:'Код практикума Python'})
    check(await route().count()===6,'six Python steps are visible')
    await p.getByRole('button',{name:'Запустить пример',exact:true}).click();await p.getByRole('button',{name:'Итог',exact:true}).waitFor({timeout:65000})
    check(await editor.inputValue()===lessons[0].starter,'example preserves the draft');check((await state()).xp===0,'example gives no XP')
    await p.getByRole('button',{name:'Строка 3 вверх'}).click();await p.getByRole('button',{name:'Строка 2 вверх'}).click();await p.getByRole('button',{name:'Строка 3 вверх'}).click()
    check(await editor.inputValue()===lessons[0].solution,'line reordering builds real Python')
    for(let i=0;i<6;i++){
      if(i)await editor.fill(lessons[i].solution)
      await run();await p.locator('.practice-verdict.success').waitFor()
      check((await state()).completed.includes(lessons[i].id),lessons[i].id+' completes')
      await p.getByRole('button',{name:'Итог',exact:true}).click();check((await p.locator('.practice-console').innerText()).includes(lessons[i].expected),lessons[i].id+' produces actual output')
      if(i===3){check(await p.locator('.parcel-tray b').count()===2,'trace visualizes the filtered parcel list');await p.getByRole('button',{name:'Назад по выполнению'}).click();check((await p.locator('.parcel-trace header').innerText()).includes('Шаг'),'trace can step backward')}
      if(i<5)await p.getByRole('button',{name:'Следующий шаг',exact:true}).click()
    }
    check(await p.locator('.practice-complete').count()===1,'Python project completes its route');const pythonXP=(await state()).xp;await run();check((await state()).xp===pythonXP,'repeat never duplicates XP')
    const downloadEvent=p.waitForEvent('download');await p.getByRole('button',{name:'Скачать программу .py'}).click();check((await downloadEvent).suggestedFilename()==='island-post.py','Python project exports')
    await p.getByRole('button',{name:'Итог',exact:true}).click();await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/practice-python.png',fullPage:true})
    await openWeb();check(await route().count()===7,'seven web steps are visible')
    const webs=lessons.filter(l=>l.track==='web')
    for(let i=0;i<webs.length;i++){
      await run();check(await p.locator('.practice-verdict.success').count()===0,webs[i].id+' starter does not pass')
      await setWeb(webs[i].solutionHtml,webs[i].solutionCss);await run();await p.locator('.practice-verdict.success').waitFor()
      check((await state()).completed.includes(webs[i].id),webs[i].id+' computed browser checks pass')
      if(i===5){await p.getByRole('button',{name:'Показать наведение',exact:true}).click();check(await p.frameLocator('iframe[title="Твой сайт почты"]').locator('.postcard').evaluate(e=>getComputedStyle(e).transform)==='matrix(1, 0, 0, 1, 0, -4)','hover demonstration works with reduced motion')}
      if(i<6)await p.getByRole('button',{name:'Следующий шаг',exact:true}).click()
    }
    check((await state()).xp===900,'all thirteen tasks total 900 XP');check(await p.locator('.practice-complete').count()===1,'web project completes its route')
    await p.getByRole('button',{name:'Образец',exact:true}).click();await run();await p.locator('.practice-verdict.success').waitFor();check(true,'checking while target is open validates the learner page')
    await p.getByRole('button',{name:'Сравнить',exact:true}).click();check(await p.locator('iframe:visible').count()===2,'current and target pages compare together')
    const dl=p.waitForEvent('download');await p.getByRole('button',{name:'Скачать страницу .html'}).click();check((await dl).suggestedFilename()==='island-post.html','web project exports')
    await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/practice-web.png',fullPage:true})
    await p.reload();await p.getByRole('button',{name:'Практикум',exact:true}).click();await openWeb();await route().nth(6).click();await p.getByRole('button',{name:'index.html',exact:true}).click();check(await p.getByRole('textbox',{name:'Код практикума HTML'}).inputValue()===webs[6].solutionHtml,'both-file project draft survives reload');check((await state()).xp===900,'new achievements normalize on reload')
    await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Сравнить',exact:true}).click();await run();await p.locator('.practice-verdict.success').waitFor();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile has no horizontal overflow');await p.locator('.practice-web-preview').screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/practice-mobile.png'})
    check(report.errors.length===0,'no browser exceptions')
    return report
  }finally{await ctx.close()}
}
