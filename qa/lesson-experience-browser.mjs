// Real UI and local Python runtime; caller supplies the checked-in course fixtures.
export async function lessonExperienceChecks(page, lessons, base='http://127.0.0.1:5191/Learn_Code/') {
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1000}})
  const p=await context.newPage(), report={checks:[],errors:[]}
  const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message))
  const stored=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')))
  const select=async i=>{await p.locator('.syllabus section button').nth(i).click()}
  const tab=async name=>{await p.getByRole('tab',{name:new RegExp(name)}).click()}
  const editor=()=>p.getByRole('textbox',{name:'Код решения',exact:true})
  const answer=async(i,correct=true)=>{await tab('Проверить себя');await p.getByRole('radio').nth(correct?lessons[i].quiz.correct:(lessons[i].quiz.correct+1)%lessons[i].quiz.options.length).check();await p.getByRole('button',{name:'Проверить ответ',exact:true}).click()}
  const run=async code=>{await tab('Написать код');await editor().fill(code);await p.getByRole('button',{name:'Запустить код',exact:true}).click();await p.locator('.python-checks').waitFor({timeout:60000})}
  const done=async i=>{await p.locator('.syllabus section button.is-complete').filter({hasText:lessons[i].title.split(': ').at(-1)}).waitFor()}
  try {
    await p.goto(base,{waitUntil:'commit'});await p.getByRole('button',{name:'Начать с нуля',exact:true}).click()
    await p.getByRole('button',{name:'Посмотреть выполнение примера',exact:false}).click()
    await p.waitForFunction(()=>!document.querySelector('.python-loading'),{},{timeout:60000})
    check(!Object.values((await stored()).learning??{}).some(e=>e.passed),'demo never awards practice')
    await answer(0,false);await run(lessons[0].solution)
    await p.getByText('Практика зачтена и сохранена.',{exact:false}).waitFor()
    check(!(await stored()).completed.includes(lessons[0].id),'code alone does not complete an unanswered quiz')
    await answer(0);await done(0)
    check((await stored()).xp===lessons[0].xp+10,'quiz after code completes automatically with one award')
    check(await p.locator('.syllabus button.is-complete svg').count()===1,'completed lesson has visible checkmark')
    check(await p.locator('.syllabus button.is-complete').evaluate(e=>getComputedStyle(e).backgroundImage.includes('linear-gradient')),'completed lesson has green gradient')
    await p.getByRole('button',{name:'Следующий урок',exact:true}).click()
    check((await p.locator('.lesson-header').innerText()).includes(lessons[1].title),'next button navigates')
    await answer(1);await run('print("wrong")')
    check(!(await stored()).completed.includes(lessons[1].id),'incorrect code never completes lesson')
    await run(lessons[1].solution);await done(1)
    check((await stored()).xp===lessons[0].xp+lessons[1].xp+20,'quiz before code completes automatically')
    await p.getByRole('button',{name:'Назад',exact:true}).click();await run(lessons[0].solution)
    check((await stored()).xp===lessons[0].xp+lessons[1].xp+20,'repeat run never duplicates XP')
    await select(2);await run(lessons[2].solution)
    await p.getByText('Практика зачтена и сохранена.',{exact:false}).waitFor()
    await select(3);await p.reload({waitUntil:'commit'})
    await p.locator('.side-nav').getByRole('button',{name:'Курс Python',exact:true}).click();await select(2);await tab('Написать код')
    check(await editor().inputValue()===lessons[2].solution,'draft survives reload')
    check(await p.getByText('Практика зачтена и сохранена.',{exact:false}).isVisible(),'practice survives navigation and reload')
    await answer(2);await done(2)
    check((await stored()).completed.filter(id=>/^python-v2-\d\d$/.test(id)).length===3,'stored practice plus later quiz completes lesson')
    await select(3);await answer(3);await tab('Написать код');await editor().fill('while True:\n    pass')
    await p.getByRole('button',{name:'Запустить код',exact:true}).click();await p.getByRole('button',{name:'Остановить',exact:true}).waitFor();await editor().fill('# изменено во время запуска')
    await p.waitForTimeout(150)
    check(!(await stored()).completed.includes(lessons[3].id)&&await p.locator('.python-loading').count()===0,'editing cancels old run without a stale award')
    await p.getByRole('button',{name:'Автоподсказки',exact:true}).click()
    for(const width of [1440,390,320]) {
      await p.setViewportSize({width,height:1000})
      await editor().fill(Array.from({length:24},(_,i)=>'# строка '+(i+1)).join('\n'));await editor().press('Control+End');await p.waitForTimeout(80)
      const before=await editor().evaluate(e=>e.clientHeight)
      await editor().press('Enter');await p.waitForTimeout(80)
      const dimensions=await editor().evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),lines=e.value.split('\n').length,last=document.querySelector('.line-numbers').lastElementChild.getBoundingClientRect(),bottom=document.querySelector('.mobile-nav').getBoundingClientRect();return {height:e.clientHeight,scrollHeight:e.scrollHeight,lineHeight:parseFloat(s.lineHeight),caret:r.top+parseFloat(s.paddingTop)+(lines-1)*parseFloat(s.lineHeight),last:last.top,viewportBottom:bottom.height?bottom.top:innerHeight}})
      check(Math.abs(dimensions.height-before-dimensions.lineHeight)<2,`${width}: Enter grows editor by one line`)
      check(dimensions.scrollHeight<=dimensions.height+1&&Math.abs(dimensions.last-dimensions.caret)<2,`${width}: no inner vertical scrolling and gutter stays aligned`)
      check(dimensions.caret>70&&dimensions.caret+dimensions.lineHeight<=dimensions.viewportBottom-10,`${width}: caret remains visible`)
      await editor().fill('# короткий код');await p.waitForTimeout(80)
      check(await editor().evaluate(e=>e.clientHeight)<before/2,`${width}: deleting code shrinks editor`)
      await p.locator('.lesson-navigation').scrollIntoViewIfNeeded()
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no horizontal page overflow`)
      check(await p.locator('.lesson-navigation').evaluate(e=>{const b=[...e.querySelectorAll('button')].map(x=>x.getBoundingClientRect());return b.every(x=>x.width>65&&x.height>=44)&&b[0].right<=b[1].left+1}),`${width}: navigation targets do not overlap`)
    }
    await p.setViewportSize({width:1440,height:1000});await tab('Разобраться')
    await p.locator('.lesson-navigation').scrollIntoViewIfNeeded()
    const next=p.getByRole('button',{name:'Следующий урок',exact:true})
    check(await next.evaluate(e=>getComputedStyle(e,'::before').animationName)==='lesson-nebula','cosmic navigation animates')
    const contrast=await next.evaluate(e=>{
      const colors=text=>[...text.matchAll(/rgba?\(([^)]+)\)/g)].map(m=>m[1].split(',').map(Number))
      const luminance=rgb=>rgb.slice(0,3).map(c=>{const x=c/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0)
      const style=getComputedStyle(e),text=luminance(colors(style.color)[0]),base=colors(style.backgroundImage),overlay=colors(getComputedStyle(e,'::before').backgroundImage)
      // Component-wise maxima bound every interpolated color throughout the animation.
      const brightest=Array.from({length:3},(_,i)=>Math.max(...base.map(c=>c[i])))
      const alpha=Math.max(...overlay.map(c=>c[3]??1)),wash=Array.from({length:3},(_,i)=>Math.max(...overlay.map(c=>c[i])))
      return (text+.05)/(luminance(brightest.map((c,i)=>c*(1-alpha)+wash[i]*alpha))+.05)
    })
    check(contrast>=4.5,`navigation text contrast stays above 4.5:1 throughout shimmer (${contrast.toFixed(2)}:1 conservative bound)`)
    await next.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/lesson-cosmic-button.png'})
    await p.emulateMedia({reducedMotion:'reduce'})
    check(await next.evaluate(e=>getComputedStyle(e,'::before').animationName)==='none','reduced motion disables shimmer')
    await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/lesson-completion-desktop.png'})
    await p.locator('.side-nav').getByRole('button',{name:'Приключение',exact:true}).click()
    await p.getByRole('button',{name:'Идти к цели',exact:true}).click();await p.locator('#island-quest-title').waitFor();await p.getByRole('button',{name:'Написать код',exact:true}).click()
    for(const width of [1440,390]) {
      await p.setViewportSize({width,height:844});const pageScroll=await p.evaluate(()=>scrollY)
      await editor().fill(Array.from({length:24},(_,i)=>'# команда '+(i+1)).join('\n'));await editor().press('Control+End');await editor().press('Enter');await p.waitForTimeout(120)
      const measured=await editor().evaluate(e=>{const d=e.closest('dialog'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {height:e.clientHeight,scrollHeight:e.scrollHeight,caret:r.top+parseFloat(s.paddingTop)+(e.value.split('\n').length-1)*parseFloat(s.lineHeight),lineHeight:parseFloat(s.lineHeight),bottom:d.getBoundingClientRect().bottom,scroll:d.scrollTop,pageScroll:scrollY}})
      check(measured.scrollHeight<=measured.height+1&&measured.scroll>0,`${width}: island dialog scrolls instead of code box`)
      check(measured.caret+measured.lineHeight<=measured.bottom-10&&measured.pageScroll===pageScroll,`${width}: island caret visible and background page stationary`)
    }
    await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/lesson-editor-island-mobile.png'})
    check(report.errors.length===0,'no browser exceptions')
    return report
  } catch(error) {
    await p.screenshot({path:'C:/Users/big-a/Documents/Codex_мои_программы/KIMI_Lear_Code/qa/lesson-experience-failure.png'})
    throw new Error(`${error.message}\nPassed: ${report.checks.join('; ')}\nBrowser: ${report.errors.join('; ')}`)
  } finally {await context.close()}
}
