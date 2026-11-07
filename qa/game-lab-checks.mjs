export default async function gameLabChecks(page) {
  page.setDefaultTimeout(10000)
  const report={checks:[],errors:[]}
  const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  page.on('pageerror',e=>report.errors.push(e.message))
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.setViewportSize({width:1440,height:1000})
  await page.goto('http://127.0.0.1:5175')
  check((await page.request.get('http://127.0.0.1:5175/api/health')).ok(),'QA SQL API reachable')
  await page.getByRole('button',{name:'Мастерская',exact:true}).click()
  const levels=await page.evaluate(async()=> (await import('/src/lib/gameLab.ts')).labLevels)
  const editor=page.getByRole('textbox',{name:'Код мастерской'})
  const run=()=>page.getByRole('button',{name:'Запустить код',exact:true}).click()
  const success=()=>page.locator('.lab-feedback.success').waitFor()
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')))
  await run()
  check((await page.locator('.lab-feedback').innerText()).includes('Добавь код'),'empty CSS gives guidance')
  await editor.fill('justify-content:center;');await run()
  check(!(await page.locator('.lab-feedback').innerText()).includes('Получилось'),'incorrect geometry fails')
  await editor.fill('position:fixed;');await run()
  check((await page.locator('.lab-feedback').innerText()).includes('Здесь доступны'),'unrelated CSS blocked')
  for(const [modeIndex,mode] of ['flex','grid','select'].entries()) {
    await page.locator('.lab-modes button').nth(modeIndex).click()
    const items=levels.filter(l=>l.mode===mode)
    for(const [i,l] of items.entries()) {
      await page.locator('.lab-levels button').nth(i).click()
      await editor.fill(l.solution);await run();await success()
      check((await state()).completed.includes(l.id),l.id+' passed and XP stored')
      if(i<3){await page.getByRole('button',{name:'Следующее открытие',exact:true}).click();check((await page.locator('.lab-brief h2').innerText())===items[i+1].title,l.id+' next level progresses')}
    }
    await page.screenshot({path:`C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/game-lab-${mode}.png`,fullPage:true})
  }
  await page.locator('.lab-modes button').nth(1).click();await page.locator('.lab-levels button').nth(2).click()
  await editor.fill('grid-column: 2 / span 2; grid-row: 2;');await run();await success();check(true,'equivalent Grid span solution accepted')
  await page.locator('.lab-modes button').nth(2).click();await page.locator('.lab-levels button').nth(0).click()
  await editor.fill('[');await run();check((await page.locator('.lab-feedback').innerText()).includes('не распознан'),'malformed selector explained')
  await editor.fill('.plant');await run();check(!(await page.locator('.lab-feedback').innerText()).includes('Получилось'),'over-selection rejected')
  await page.locator('.lab-modes button').nth(3).click()
  await page.getByRole('button',{name:'→ Вправо',exact:true}).click()
  await page.getByLabel('Повторить команду 1').selectOption('2')
  await run();await success();check((await state()).completed.includes('lab-v1-robot-01'),'block loop drives robot')
  for(const language of ['python','javascript','csharp','go']) {
    await page.locator('.lab-levels button').nth(2).click()
    await page.getByRole('button',{name:'Собрать блоки',exact:true}).click()
    await page.getByLabel('Язык робота').selectOption(language)
    const code=await page.evaluate(async(language)=> (await import('/src/lib/gameLab.ts')).blocksToCode([{direction:'right',count:2},{direction:'up',count:2}],language),language)
    await page.getByRole('button',{name:'Написать код',exact:true}).click();await editor.fill(code);await run();await success()
    check((await page.locator('.lab-board-caption').innerText()).includes('3:1'),'editable '+language+' loop reaches crystal')
  }
  for(const i of [1,3]) {
    await page.locator('.lab-levels button').nth(i).click()
    await page.getByRole('button',{name:'Написать код',exact:true}).click()
    const code=i===1?'hero.move("right")\nhero.move("right")\nhero.move("up")\nhero.move("up")':'for i in range(2):\n    hero.move("left")\nfor i in range(2):\n    hero.move("down")'
    await editor.fill(code);await run();await success();check(true,'robot level '+(i+1)+' completed')
  }
  const total=levels.reduce((n,l)=>n+l.xp,0)
  check((await state()).xp===total,'all 16 levels earn exact total XP')
  await run();await success();check((await state()).xp===total,'repeat success does not duplicate XP')
  await page.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/game-lab-robot.png',fullPage:true})
  await page.waitForTimeout(900)
  const remote=await page.evaluate(async()=>{const r=await fetch('/api/progress',{headers:{'X-Profile-Key':localStorage.getItem('code-arena-profile-key')}});return (await r.json()).progress})
  check(remote?.completed.filter(id=>id.startsWith('lab-v1')).length===16,'all game completions saved in SQLite')
  await page.reload();await page.getByRole('button',{name:'Мастерская',exact:true}).click()
  check((await state()).xp===total,'XP survives normalized reload')
  await page.locator('.lab-modes button').nth(3).click();await page.locator('.lab-levels button').nth(3).click()
  check((await editor.inputValue()).includes('range(2)'),'robot draft restores after reload')
  await page.setViewportSize({width:390,height:844})
  for(const [modeIndex,mode] of ['flex','grid','select'].entries()) {
    await page.locator('.lab-modes button').nth(modeIndex).click()
    for(const [i,l] of levels.filter(l=>l.mode===mode).entries()) {
      await page.locator('.lab-levels button').nth(i).click();await editor.fill(l.solution);await run();await success()
      check(true,l.id+' works at 390px')
    }
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+mode)
  }
  await page.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/game-lab-mobile.png',fullPage:true})
  await page.locator('.mobile-nav').getByRole('button',{name:'Прогресс',exact:true}).click()
  check((await page.locator('.progress-metrics').innerText()).includes('16'),'progress screen counts new missions')
  check(report.errors.length===0,'no browser exceptions')
  return report
}
