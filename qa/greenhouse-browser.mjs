import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
export async function greenhouseChecks(page,base='http://127.0.0.1:5191/Learn_Code/'){
 const contexts=[],report={checks:[],errors:[]},lessons=JSON.parse(await readFile(new URL('../src/data/greenhouse.json',import.meta.url),'utf8'))
 const check=(condition,label)=>{if(!condition)throw Error(label);report.checks.push(label)}
 const context=await page.context().browser().newContext({viewport:{width:1440,height:1000}});contexts.push(context)
 const p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message))
 const saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')))
 const run=async(passed)=>{await p.getByRole('button',{name:/^(Запустить и проверить|Проверить прогноз)$/}).click();await p.locator('.green-verdict').waitFor({timeout:60000});check(await p.locator('.green-verdict').evaluate(el=>el.classList.contains('is-passed'))===passed,'execution verdict '+report.checks.length)}
 const enter=async()=>{await p.getByRole('button',{name:/02 Умная теплица/}).click();await p.locator('.green-desk').waitFor()}
 try{
  await p.goto(base);check(await p.getByRole('button',{name:/03 Закрепить/}).isDisabled(),'review unavailable before first completion');await enter()
  await p.getByRole('button',{name:'Выполнить пример',exact:true}).click();await p.locator('.green-verdict.is-example').waitFor({timeout:60000});check((await saved()).completed.length===0,'teaching example never completes a lesson')
  await p.getByRole('radio',{name:'False: полив не нужен',exact:true}).check();await run(false)
  await p.getByRole('radio',{name:'True: полив нужен',exact:true}).check();await run(true)
  check((await p.locator('.green-verdict').innerText()).includes('с подсказкой'),'revealed prediction result is assisted evidence')
  for(let i=1;i<8;i++){
   await p.getByRole('button',{name:'Следующее занятие',exact:true}).click()
   if(i===2){await p.getByRole('button',{name:'Поднять строку 3',exact:true}).click();await p.getByRole('button',{name:'Поднять строку 2',exact:true}).click();await p.getByRole('button',{name:'Поднять строку 3',exact:true}).click()}
   else if(i===4){await p.getByRole('radio').nth(0).check();await run(false);await p.getByRole('radio').nth(1).check()}
   else{
    const editor=p.getByRole('textbox',{name:'Python-код теплицы',exact:true})
    if(i===1){await run(false);await p.getByRole('button',{name:'Подсказка 1 из 3',exact:true}).click()}
    await editor.fill(lessons[i].solution.replaceAll('LIMIT','35').replaceAll('HEAT','28'))
   }
   await run(true)
  }
  let s=await saved();check(s.completed.length===8&&s.xp===460,'all eight lessons save exactly 460 XP')
  check(Object.values(s.learning).filter(e=>e.kind==='attempt'&&e.passed).length===8,'successful attempts retained')
  await p.getByRole('button',{name:'К моему пути',exact:true}).click();check((await p.locator('.study-path').innerText()).includes('8/8'),'home route reflects completion')
  await p.getByRole('button',{name:'Прогресс',exact:true}).click();check((await p.locator('.green-skills').innerText()).includes('Решил с подсказкой'),'skills screen distinguishes supported learning')
  await p.locator('.green-skill-row').nth(1).getByRole('button',{name:'Повторить',exact:true}).click()
  await p.getByRole('textbox',{name:'Python-код теплицы',exact:true}).fill('water = moisture < 35');await run(false)
  await p.getByRole('textbox',{name:'Python-код теплицы',exact:true}).fill('water = not (moisture >= 45)');await run(true)
  check((await p.locator('.green-verdict').innerText()).includes('Повторил на новых данных'),'independent changed-data review advances evidence')
  s=await saved();check(s.xp===460,'review does not farm XP');check(s.drafts['greenhouse-v1-02-review'].includes('45'),'review draft separate from original')
  await p.getByRole('button',{name:'Прогресс',exact:true}).click();await p.locator('.green-skill-row').nth(0).getByRole('button',{name:'Повторить',exact:true}).click()
  await p.getByRole('button',{name:'Подсказка 1 из 3',exact:true}).click();check((await p.locator('.green-mentor').innerText()).includes('48'),'review hints use changed input')
  await p.getByRole('radio',{name:'False: полив не нужен',exact:true}).check();await run(true)
  check((await p.locator('.green-verdict').innerText()).includes('48 не меньше 45'),'review explanation agrees with Python')
  await p.getByRole('button',{name:'Мой учебный путь',exact:true}).click();await p.reload();await p.getByRole('button',{name:'Прогресс',exact:true}).click()
  check((await p.locator('.green-skill-row').nth(1).innerText()).includes('Повторил на новых данных'),'evidence survives reload')
  await p.locator('.green-skill-row').nth(6).getByRole('button',{name:'Повторить',exact:true}).click()
  const editor=p.getByRole('textbox',{name:'Python-код теплицы',exact:true});await editor.fill('water = moisture < 45 and tank > 0\nfan = temperature > 30');await run(true)
  const canvas=p.locator('.green-scene canvas');await canvas.scrollIntoViewIfNeeded();await p.screenshot({path:fileURLToPath(new URL('./greenhouse-desktop.png',import.meta.url))})
  check((await p.locator('.green-devices').innerText()).includes('Вентилятор\nВключён'),'fan state reflects executed result')
  await editor.fill('while True:\n    pass');await p.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await p.getByRole('button',{name:'Остановить',exact:true}).click();check(await p.getByRole('button',{name:'Запустить и проверить',exact:true}).isEnabled(),'learner can stop execution')
  await editor.fill('water =');await run(false);check((await p.locator('.green-mentor').innerText()).includes('двоеточие'),'syntax error gets contextual help')
  await editor.fill(Array.from({length:35},(_,i)=>'# строка '+i).join('\n'));check(await editor.evaluate(el=>el.scrollHeight<=el.clientHeight+2),'editor grows with long code')
  for(const width of [1024,768,390]){await p.setViewportSize({width,height:900});await p.locator('.green-desk').scrollIntoViewIfNeeded();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+width)}
  await p.setViewportSize({width:390,height:844});await editor.fill('water = moisture < 45 and tank > 0\nfan = temperature > 30');await p.locator('.green-desk').scrollIntoViewIfNeeded();await p.screenshot({path:fileURLToPath(new URL('./greenhouse-mobile.png',import.meta.url))})
  check(report.errors.length===0,'no uncaught exceptions')
  return report
 }finally{for(const c of contexts)await c.close()}
}
