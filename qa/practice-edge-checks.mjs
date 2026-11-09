export default async function practiceEdgeChecks(page,lessons,origin='http://127.0.0.1:5191/Learn_Code/') {
  const contexts=[],report={checks:[],errors:[]},check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
  const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});contexts.push(ctx)
  const p=await ctx.newPage();p.setDefaultTimeout(18000);p.on('pageerror',e=>report.errors.push(e.message))
  const menu=()=>p.getByRole('navigation',{name:'Маршрут практикума'}).getByRole('button')
  const setWeb=async(html,css)=>{await p.getByRole('button',{name:'index.html',exact:true}).click();await p.getByRole('textbox',{name:'Код практикума HTML'}).fill(html);await p.getByRole('button',{name:'style.css',exact:true}).click();await p.getByRole('textbox',{name:'Код практикума CSS'}).fill(css)}
  const run=async()=>{await p.getByRole('button',{name:'Проверить страницу',exact:true}).click();await p.locator('.practice-verdict').waitFor()}
  try {
    await p.goto(origin);await p.getByRole('button',{name:'Практикум',exact:true}).click()
    const editor=p.getByRole('textbox',{name:'Код практикума Python'})
    await menu().nth(1).click();await p.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await p.locator('.practice-error').waitFor({timeout:65000});check((await p.locator('.practice-error').innerText()).includes('несовместимые типы'),'type error gets Russian guidance')
    await editor.fill('while True:\n    pass');await p.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await p.getByRole('button',{name:'Остановить',exact:true}).click();await p.locator('.practice-error').waitFor();check(true,'infinite Python can be cancelled')
    await editor.fill('for i in range(160):\n    total = i\nprint(total)');await p.getByRole('button',{name:'Запустить и проверить',exact:true}).click();await p.getByRole('button',{name:'Итог',exact:true}).waitFor({timeout:65000});await p.getByRole('button',{name:'Итог',exact:true}).click();check((await p.locator('.parcel-values').innerText()).includes('159'),'truncated execution exposes final state')
    await p.getByRole('button',{name:'Подсказка 0/3'}).click();check(await p.locator('.practice-hint').isVisible(),'progressive hint is available')
    await p.getByRole('button',{name:'Повторить тему в курсе Python'}).click();check(await p.locator('.lesson-goal').count()===1,'practice returns to the relevant Python chapter');await p.getByRole('tab',{name:'03 Написать код'}).click();await p.locator('.lesson-acceptance summary').click();check(await p.locator('.lesson-acceptance li').count()>0,'existing lessons show acceptance criteria')
    await p.getByRole('button',{name:'Практикум',exact:true}).click();await p.locator('.practice-track-switch button').nth(1).click();await menu().nth(6).click()
    const lesson=lessons.at(-1),equivalent=lesson.solutionCss.replace('#f4e8c9','rgb(244, 232, 201)').replace('#23483f','rgb(35, 72, 63)').replace('repeat(3, 1fr)','1fr 1fr 1fr')
    await setWeb(lesson.solutionHtml,equivalent);await run();await p.locator('.practice-verdict.success').waitFor();check(true,'equivalent colors and grid syntax accepted')
    await p.getByRole('textbox',{name:'Код практикума CSS'}).fill(equivalent+'\n.postcard{display:none}');check(await p.locator('.practice-verdict').count()===0,'editing clears old success');await run();check(await p.locator('.practice-verdict.success').count()===0,'hidden page cannot pass')
    const outbound=[];await ctx.route('https://example.invalid/**',r=>{outbound.push(r.request().url());return r.abort()})
    const hostile='<script>parent.document.body.dataset.previewEscape="yes"</script><img src="https://example.invalid/pixel"><iframe src="https://example.invalid/frame"></iframe><a href="https://example.invalid/exit">exit</a><svg onload="alert(1)"></svg>'+lesson.solutionHtml.replace('<main','<main onclick="alert(1)"')
    await setWeb(hostile,equivalent+'\n@import "https://example.invalid/sheet.css";');await run();await p.locator('.practice-verdict.success').waitFor()
    check(await p.frameLocator('iframe[title="Твой сайт почты"]').locator('script,img,iframe,a,svg,[onclick]').count()===0,'preview strips executable and external HTML')
    check(await p.evaluate(()=>!document.body.dataset.previewEscape),'preview cannot execute script in parent');check(outbound.length===0,'preview HTML and imports cause no outbound requests')
    const before=(await p.getByRole('textbox',{name:'Код практикума CSS'}).inputValue());await p.getByRole('textbox',{name:'Код практикума CSS'}).fill(before+'\n/* harmless edit */');await run();check(await p.locator('.practice-verdict.success').count()===1,'semantically identical preview edits never get stuck loading')
    await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'index.html',exact:true}).click();await p.getByRole('textbox',{name:'Код практикума HTML'}).focus();check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile code editor fits')
    await p.locator('.mobile-nav').getByRole('button',{name:'Курсы',exact:true}).click();check(await p.getByRole('region',{name:'Практические маршруты'}).count()===1,'catalog exposes working learning paths')
    await p.locator('.learning-path').nth(1).getByRole('button').click();check(await p.locator('.practice-track-switch button').nth(1).getAttribute('aria-pressed')==='true','catalog opens the selected web route')
    check(report.errors.length===0,'no edge-case browser exceptions');return report
  }finally{for(const c of contexts)await c.close()}
}
