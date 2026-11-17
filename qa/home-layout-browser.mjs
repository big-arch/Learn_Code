export async function homeLayoutChecks(page,base='http://127.0.0.1:5191/Learn_Code/'){
 const c=await page.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),report={checks:[],errors:[]}
 const check=(ok,name)=>{if(!ok)throw Error(name);report.checks.push(name)}
 const p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message))
 const region=()=>p.getByRole('region',{name:'Мой учебный путь',exact:true})
 async function geometry(width,state){
  await p.setViewportSize({width,height:1000});await region().waitFor()
  const layout=await region().evaluate(el=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
   const [intro,steps]=el.children,head=rect(intro),cards=rect(steps),bounds=rect(el),text=rect(intro.firstElementChild),action=rect(intro.lastElementChild)
   const intersect=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1
   const sections=[...document.querySelectorAll('.studio-home>section')].map(rect)
   return {introWidth:head.width,routeWidth:bounds.width,stepsBelow:cards.y>=head.bottom+10,ctaOverlap:intersect(text,action),inside:rect(steps).right<=bounds.right+1&&[...steps.children].every(e=>{const r=rect(e);return r.x>=bounds.x-1&&r.right<=bounds.right+1}),sectionOverlap:sections.some((r,i)=>i>0&&r.y<sections[i-1].bottom-1),overflow:document.documentElement.scrollWidth>innerWidth+1}
  })
  check(layout.introWidth>=layout.routeWidth-2,`${state} ${width}: intro uses full row`)
  check(layout.stepsBelow&&!layout.ctaOverlap&&layout.inside&&!layout.sectionOverlap&&!layout.overflow,`${state} ${width}: no overlap or overflow`)
 }
 try{
  await p.goto(base,{waitUntil:'commit',timeout:30000});await region().waitFor()
  for(const width of [1920,1440,1280,1024,820,768,560,390,320])await geometry(width,'new learner')
  await p.evaluate(()=>{const state=JSON.parse(localStorage.getItem('code-arena-progress-v1'));state.completed=Array.from({length:8},(_,i)=>'greenhouse-v1-0'+(i+1));state.completedAt=Object.fromEntries(state.completed.map(id=>[id,new Date().toISOString()]));localStorage.setItem('code-arena-progress-v1',JSON.stringify(state))})
  await p.reload({waitUntil:'commit'});await region().getByRole('heading',{name:'Теплица работает. Продолжай открывать Python.',exact:true}).waitFor()
  for(const width of [1440,1024,390,320])await geometry(width,'completed chapter')
  await p.setViewportSize({width:1440,height:1000});await p.getByRole('button',{name:'Курсы',exact:true}).click()
  const tracks=p.getByRole('region',{name:'Практические маршруты',exact:true});await tracks.waitFor()
  check(await tracks.locator('article').count()===2,'existing practice routes remain available')
  check(await tracks.locator('article').first().evaluate(el=>{const children=[...el.children].map(c=>c.getBoundingClientRect());return children[0].right<=children[1].x&&children[1].right<=children[2].x}),'practice route retains its three-column layout')
  await p.getByRole('button',{name:'Главная',exact:true}).click();await region().getByRole('button',{name:/02 Умная теплица/}).click();await p.getByRole('heading',{name:/Умная теплица/,level:1}).waitFor();check(true,'greenhouse navigation works after class isolation')
  check(report.errors.length===0,'no browser exceptions');return report
 }finally{await c.close()}
}
