export default async function practiceMotionChecks(page,lessons,origin='http://127.0.0.1:5191/Learn_Code/') {
  const ctx=await page.context().browser().newContext({viewport:{width:1680,height:1050},reducedMotion:'no-preference'}),p=await ctx.newPage()
  const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name)};p.setDefaultTimeout(15000)
  try {
    await p.goto(origin);await p.getByRole('button',{name:'Практикум',exact:true}).click();await p.getByRole('navigation',{name:'Маршрут практикума'}).getByRole('button').nth(3).click()
    await p.getByRole('textbox',{name:'Код практикума Python'}).fill(lessons[3].solution);await p.getByRole('button',{name:'Запустить и проверить'}).click();await p.locator('.practice-verdict.success').waitFor({timeout:65000});await p.waitForTimeout(1100)
    check(!(await p.locator('.parcel-trace header').innerText()).includes('Шаг 1 из'),'execution advances automatically with motion on')
    await p.locator('.parcel-controls').getByRole('button',{name:'Пауза',exact:true}).click();const paused=await p.locator('.parcel-trace header').innerText();await p.waitForTimeout(1100);check(await p.locator('.parcel-trace header').innerText()===paused,'pause freezes the execution snapshot')
    await p.locator('.parcel-controls').getByRole('button',{name:'По шагам',exact:true}).click();await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.parcel-controls').getByRole('button',{name:'По шагам',exact:true}).waitFor();check(true,'reduced-motion change pauses playback')
    await p.getByRole('button',{name:'Итог',exact:true}).click();await p.locator('.practice-theory summary').click();await p.locator('.practice-heading h1').click();await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/practice-desktop.png'})
    await p.locator('.practice-track-switch button').nth(1).click();await p.getByRole('navigation',{name:'Маршрут практикума'}).getByRole('button').nth(5).click();await p.getByRole('textbox',{name:'Код практикума CSS'}).fill(lessons[11].solutionCss);await p.getByRole('button',{name:'Проверить страницу'}).click();await p.locator('.practice-verdict.success').waitFor()
    const card=p.frameLocator('iframe[title="Твой сайт почты"]').locator('.postcard')
    check(await card.evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','preview disables transition for reduced motion')
    await p.emulateMedia({reducedMotion:'no-preference'});check(await card.evaluate(e=>getComputedStyle(e).transitionDuration)==='0.2s','preview enables the authored 200ms transition')
    await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'К редактору ↓',exact:true}).click();check(await p.locator('#practice-editor').evaluate(e=>Math.abs(e.getBoundingClientRect().top-90)<5),'mobile jump reaches editor below header')
    await p.getByRole('button',{name:'Посмотреть результат ↓',exact:true}).click();check(await p.locator('#practice-result').evaluate(e=>Math.abs(e.getBoundingClientRect().top-90)<5),'mobile jump reaches result below header')
    return {checks}
  }finally{await ctx.close()}
}
