export default async (page) => {
  page.setDefaultTimeout(8000)
  const report = { checks: [], errors: [] }
  const check = (ok, name) => { if (!ok) throw new Error(name); report.checks.push(name) }
  page.on('pageerror', err => report.errors.push(err.message))
  await page.setViewportSize({width:1440,height:1000})
  await page.goto('http://127.0.0.1:5175')
  await page.getByRole('button',{name:'Я никогда не писал код'}).waitFor()
  await page.evaluate(() => { localStorage.removeItem('code-arena-progress-v1'); localStorage.removeItem('code-arena-profile-key') })
  await page.reload()
  await page.getByRole('button',{name:'Я никогда не писал код'}).waitFor()
  const unit = await page.evaluate(async () => {
    const {courses} = await import('/src/data/courses.ts')
    const {getLessons} = await import('/src/data/lessons.ts')
    const {validateMission} = await import('/src/lib/missionEngine.ts')
    const results=[]
    const test=(ok,name)=>{if(!ok)throw Error(name);results.push(name)}
    for (const c of courses) for(const m of getLessons(c)){
      test(validateMission({...c,mission:m},m.solution).ok, m.id+' solution')
      test(!validateMission({...c,mission:m},m.starterCode).ok,m.id+' incomplete starter')
    }
    const py=courses[0], cs=courses[1], css=courses[5], html=courses[4]
    for(const [code,name] of [
      ['', 'empty code'],
      ['hero.move("right\')', 'mismatched quotes'],
      ['hero.move("left")','out of bounds'],
      ['hero.move("right")hero.move("up")','glued commands'],
      ['while True:\n    hero.move("right")','unsupported unbounded loop'],
      ['for step in range(999999999):\n    hero.move("right")','huge loop'],
      ['for step in range(2):\nhero.move("right")','missing indentation'],
      ['hero.move("right")\nhero.move("left")\n'+py.mission.solution,'long route reaches goal'],
      ['# '+py.mission.solution.replaceAll('\n','\n# '),'comments do not execute'],
      ['x'.repeat(20001),'oversized source']
    ]) test(!validateMission(py,code).ok,name)
    test(!validateMission(cs,cs.mission.solution.replaceAll(';','')).ok,'C# semicolons required')
    test(!validateMission({...py,mission:getLessons(py)[1]},py.mission.solution).ok,'loop lesson requires loop')
    test(!validateMission(css,'#pond { /* display: flex; justify-content: flex-end; */ }').ok,'CSS comments cannot win')
    test(!validateMission(css,'#pond {display:flex;justify-content:flex-end;justify-content:flex-start}').ok,'last CSS declaration wins')
    test(!validateMission(css,'.other {display:flex;justify-content:flex-end}').ok,'wrong CSS selector')
    test(validateMission(css,'#pond {display:flex;justify-content:flex-end!important} #pond {justify-content:flex-start}').ok,'CSS important precedence')
    test(!validateMission(html,'<main></main><h1>КОД:АРЕНА</h1><button>Запустить</button>').ok,'HTML elements must be inside main')
    return results
  })
  report.checks.push(...unit)
  await page.getByRole('button',{name:'Я никогда не писал код'}).click()
  check(await page.locator('.robot-canvas canvas').count()===1,'Three.js game canvas')
  await page.getByRole('button',{name:'Запустить код',exact:true}).click()
  await page.locator('.validation-message.error').waitFor()
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).xp)===0,'incomplete run awards no XP')
  await page.getByRole('button',{name:'Нужна подсказка?'}).click()
  check((await page.locator('.hint-content').innerText()).includes('ПОДСКАЗКА 1/3'),'progressive hint')
  const courses = await page.evaluate(async()=> {
    const {courses}=await import('/src/data/courses.ts');const {getLessons}=await import('/src/data/lessons.ts')
    return courses.map(c=>({id:c.id,name:c.name,lessons:getLessons(c)}))
  })
  for(const c of courses) {
    await page.locator('.language-switcher').getByRole('button',{name:c.name,exact:true}).click()
    for(let i=0;i<c.lessons.length;i++) {
      await page.locator('.lesson-tabs button').nth(i).click()
      await page.getByRole('textbox',{name:'Код решения'}).fill(c.lessons[i].solution)
      await page.getByRole('button',{name:'Запустить код',exact:true}).click()
      await page.locator('.validation-message.success').waitFor()
      check(await page.evaluate(id=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).completed.includes(id),c.lessons[i].id),'UI completion '+c.lessons[i].id)
      if(c.id==='python'&&i===0) {
        await page.getByRole('button',{name:'К началу',exact:true}).click()
        await page.getByRole('button',{name:'Следующий шаг →',exact:true}).click()
        check((await page.locator('.trace-panel p').innerText()).includes('шаг вправо'),'step execution description')
        check(await page.locator('.active-line').innerText()==='01','active line marker')
        const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).xp)
        await page.getByRole('button',{name:'Запустить код',exact:true}).click()
        check(await page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).xp)===xp,'no duplicate XP')
      }
    }
  }
  await page.locator('.side-nav').getByRole('button',{name:'Прогресс',exact:true}).click()
  await page.getByText('Сохранено в SQL.',{exact:false}).waitFor()
  const remote = await page.evaluate(async()=> (await (await fetch('/api/progress',{headers:{'X-Profile-Key':localStorage.getItem('code-arena-profile-key')}})).json()).progress)
  check(remote.completed.length===12,'all 12 missions stored in SQLite')
  await page.reload()
  await page.getByRole('button',{name:'Я никогда не писал код'}).waitFor()
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).completed.length)===12,'progress survives reload')
  await page.evaluate(()=>localStorage.removeItem('code-arena-progress-v1'))
  await page.reload()
  await page.getByRole('button',{name:'Я никогда не писал код'}).waitFor()
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('code-arena-progress-v1')).completed.length)===12,'restore from SQL without local progress')
  await page.setViewportSize({width:390,height:844})
  for(const nav of ['Главная','Курсы','Карта','Арена','Прогресс','Обзор']) {
    await page.locator('.mobile-nav').getByRole('button',{name:nav,exact:true}).click()
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no horizontal overflow: '+nav)
  }
  check(report.errors.length===0,'no uncaught JavaScript errors')
  return report
}
