export default async function mechanismChecks(page,missions,origin='http://127.0.0.1:5191/Learn_Code/') {
  const browser=page.context().browser(),contexts=[],report={checks:[],errors:[]}
  const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  async function device(options={}){const ctx=await browser.newContext({viewport:{width:1500,height:1100},...options});contexts.push(ctx);const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(20000);return p}
  try {
    const p=await device();await p.goto(origin);await p.getByRole('button',{name:'Мастерская',exact:true}).click()
    const editor=p.getByRole('textbox',{name:'Python-код механизмов'}),orders=p.getByRole('navigation',{name:'Заказы мастерской'})
    const run=async()=>{await p.getByRole('button',{name:'Запустить устройства',exact:true}).click();await p.locator('.mechanism-verdict').waitFor({timeout:60000})}
    const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')))
    check(await orders.getByRole('button').nth(1).isDisabled(),'next order locked before completion')
    await p.getByRole('button',{name:'Посмотреть пример',exact:true}).click();await p.getByRole('button',{name:'К результату',exact:true}).waitFor({timeout:60000});await p.getByRole('button',{name:'К результату',exact:true}).click()
    check(await editor.inputValue()===missions[0].starter,'example preserves learner draft');check((await saved()).xp===0,'example gives no XP')
    check((await p.locator('.mechanism-variables').innerText()).includes('2'),'example trace shows computed value')
    await p.getByRole('button',{name:'2',exact:true}).click();check((await p.locator('.mechanism-prediction').innerText()).startsWith('Верно'),'prediction gives explanation')
    await editor.fill('power = "3"');await run();check(await p.locator('.mechanism-verdict.is-passed').count()===0,'wrong type rejected');check((await saved()).completed.length===0,'failed code gives no progress')
    await editor.fill('power = missing');await run();check((await p.locator('.mechanism-error').innerText()).includes('неизвестное имя'),'Python error is explained in Russian')
    await p.getByRole('button',{name:'Подсказка 0/3'}).click();check(await p.locator('.mechanism-hint-text').isVisible(),'progressive hint available')
    for(let i=0;i<missions.length;i++){
      await editor.fill(missions[i].solution);await run();await p.locator('.mechanism-verdict.is-passed').waitFor();await p.getByRole('button',{name:'К результату',exact:true}).click()
      const s=await saved();check(s.completed.includes(missions[i].id),missions[i].id+' completes and saves')
      check((await p.locator('.mechanism-variables').innerText()).includes(missions[i].targets[0].value),missions[i].id+' displays actual variable')
      if(i===1){await p.getByRole('button',{name:'Предыдущий шаг',exact:true}).click();check(!(await p.locator('.mechanism-variables').innerText()).includes('power'),'step back reveals state before power assignment');await p.getByRole('button',{name:'К результату',exact:true}).click()}
      if(i<5)await p.getByRole('button',{name:'Следующий заказ',exact:true}).click()
    }
    const total=missions.reduce((n,m)=>n+m.xp,0);check((await saved()).xp===total,'all six orders award exact XP')
    check(await p.locator('.mechanism-finale').isVisible(),'final project has completion ending')
    await run();check((await saved()).xp===total,'repeating success never duplicates XP')
    await p.getByRole('button',{name:'К результату',exact:true}).click();await p.locator('.mechanism-device-grid button').nth(2).click();check((await p.locator('.mechanism-inspector strong').innerText())==='Турбина','device inspection works with accessible button')
    await p.getByRole('button',{name:/Как это работает/}).click();await p.locator('.mechanism-layout').screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/mechanisms-complete.png'})
    await p.reload();await p.getByRole('button',{name:'Мастерская',exact:true}).click();await orders.getByRole('button').nth(5).click();check(await editor.inputValue()===missions[5].solution,'draft survives reload');check((await p.locator('.mechanism-progress').innerText()).includes('6 / 6'),'achievements survive reload')
    await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'К заданию и коду ↓',exact:true}).click();check(await editor.isVisible(),'mobile has route to task and code');await run();await p.getByRole('button',{name:'Посмотреть устройства ↑',exact:true}).click();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile layout has no horizontal overflow');await p.locator('.mechanism-world').screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/mechanisms-mobile.png'})
    await p.getByRole('button',{name:'Другие мастерские',exact:true}).click();check(await p.getByRole('textbox',{name:'Код мастерской',exact:true}).count()===1,'existing games remain accessible')
    const fallback=await device({reducedMotion:'reduce'});await fallback.context().addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args)}});await fallback.goto(origin);await fallback.getByRole('button',{name:'Мастерская',exact:true}).click();await fallback.locator('.mechanism-fallback').waitFor();check(true,'no-WebGL fallback explains devices');await fallback.getByRole('textbox',{name:'Python-код механизмов'}).fill('power=3');await fallback.getByRole('button',{name:'Запустить устройства',exact:true}).click();await fallback.locator('.mechanism-verdict.is-passed').waitFor({timeout:60000});check(true,'lesson completes without WebGL')
    const slow=await device();await slow.goto(origin);await slow.getByRole('button',{name:'Мастерская',exact:true}).click();await slow.getByRole('textbox',{name:'Python-код механизмов'}).fill('while True:\n    pass');await slow.getByRole('button',{name:'Запустить устройства',exact:true}).click();await slow.getByRole('button',{name:'Остановить',exact:true}).click();await slow.locator('.mechanism-error').waitFor();check(true,'running Python can be cancelled');check(await slow.getByRole('textbox',{name:'Python-код механизмов'}).inputValue()==='while True:\n    pass','cancellation preserves draft')
    await slow.getByRole('textbox',{name:'Python-код механизмов'}).fill('for i in range(150):\n    power = 0\npower = 12');await slow.getByRole('button',{name:'Запустить устройства',exact:true}).click();await slow.locator('.mechanism-verdict').waitFor({timeout:60000});await slow.getByRole('button',{name:'К результату',exact:true}).click();check((await slow.locator('.mechanism-inspector>span').innerText())==='12 · int','truncated trace still shows the actual final device state');check((await slow.locator('.mechanism-current-line').innerText()).includes('Программа завершена'),'final snapshot is clearly labelled')
    check(report.errors.length===0,'no browser exceptions');return report
  }finally{for(const c of contexts)await c.close()}
}
