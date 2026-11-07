import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import * as THREE from 'three'
import type { PythonResult, PythonStep } from '../lib/pythonRunner'
import { useProgress } from '../state/useProgress'

function Workshop({step,source,playing,success,motion}:{step?:PythonStep;source:string;playing:boolean;success:boolean;motion:boolean}) {
  const host=useRef<HTMLDivElement>(null),live=useRef({step,source,playing,success,motion})
  const [failed,setFailed]=useState(false)
  useEffect(()=>{live.current={step,source,playing,success,motion}},[step,source,playing,success,motion])
  useEffect(()=>{
    const el=host.current;if(!el)return
    let renderer:THREE.WebGLRenderer
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch{queueMicrotask(()=>setFailed(true));return}
    renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden','true')
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,3.1,-3.1,.1,80)
    camera.position.set(5,8,12);camera.lookAt(0,.35,0)
    scene.add(new THREE.HemisphereLight('#d6eaff','#28433d',2))
    const sun=new THREE.DirectionalLight('#fff0d6',3);sun.position.set(-3,9,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:5,bottom:-5});scene.add(sun)
    const materials=new Map<string,THREE.MeshStandardMaterial>()
    const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75,flatShading:true}));return materials.get(color)!}
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
    const ball=(x:number,y:number,z:number,r:number,color:string,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),material(color));m.position.set(x,y,z);parent.add(m);return m}
    box(0,-.3,0,8,.5,4.5,'#335c57');box(0,-.02,0,8.1,.1,4.6,'#cdbb90')
    for(let i=0;i<16;i++)box(-3.8+i*.5,.04,0,.025,.015,4.4,'#aa986e')
    box(0,.18,.65,6.7,.23,.8,'#334b4d')
    for(let i=0;i<19;i++)box(-3.2+i*.35,.32,.65,.18,.05,.74,'#6a9691')
    for(const x of [-2.8,2.8]){box(x,.48,-.55,1.5,.85,1.2,'#476f69');box(x,.94,-.55,1.65,.12,1.3,'#e0bd7f')}
    box(-2.8,1.45,-.8,1.2,.86,.16,'#243d46');box(-2.8,1.46,-.69,1,.61,.05,'#79bdc5')
    for(let i=0;i<3;i++)box(-3.1+i*.3,1.45,-.65,.14,.08,.025,'#d1f4e5')
    box(2.8,1.3,-.75,1.2,.56,.25,'#233e43')
    const outputLamp=ball(2.8,1.9,-.7,.2,'#f6c36f')
    box(0,.3,-.65,2.25,.5,1.2,'#567569');box(0,.59,-.65,2.4,.08,1.3,'#dce0be')
    const cubes=Array.from({length:6},(_,i)=>box(-.78+(i%3)*.78,.86,-1+Math.floor(i/3)*.65,.55,.5,.5,['#efb15f','#81c1bd','#b7a0d1'][i%3]))
    const robot=new THREE.Group();scene.add(robot);robot.position.set(-2.8,.1,1.2)
    box(0,.55,0,.55,.6,.4,'#e6ae54',robot);box(0,1.07,0,.72,.48,.52,'#f6d18a',robot)
    box(0,1.1,.28,.54,.25,.04,'#203c46',robot)
    for(const x of [-.17,.17])box(x,1.12,.31,.09,.08,.02,'#8de1dc',robot)
    const arms=[box(-.4,.62,0,.16,.46,.2,'#598b85',robot),box(.4,.62,0,.16,.46,.2,'#598b85',robot)]
    for(const x of [-.18,.18])box(x,.17,.08,.2,.22,.36,'#36565b',robot)
    box(0,1.43,0,.04,.25,.04,'#476f69',robot);const antenna=ball(0,1.59,0,.09,'#efb15f',robot)
    const packet=box(0,.63,.52,.38,.35,.33,'#8cdbd1',robot)
    const sparks=Array.from({length:10},(_,i)=>ball(Math.cos(i)*2,1.1,Math.sin(i)*1.5,.055,'#ffe3a4'))
    let raf=0,last=performance.now(),elapsed=0,inView=true,lost=false
    const query=matchMedia('(prefers-reduced-motion: reduce)')
    const render=(now:number)=>{
      raf=0;if(document.hidden||!inView||lost)return
      const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt
      const p=live.current,animate=p.motion&&!query.matches,line=p.step?p.source.split('\n')[p.step.line-1]??'':''
      const destination=/\bprint\s*\(/.test(line)?2.6:/\binput\s*\(/.test(line)?-2.6:0
      robot.position.x=animate?THREE.MathUtils.damp(robot.position.x,p.step?destination:-2.6,4,dt):p.step?destination:-2.6
      const moving=Math.abs(robot.position.x-destination)>.08&&Boolean(p.step)
      robot.position.y=.1+(animate&&(moving||p.playing)?Math.sin(elapsed*9)*.05:0)
      arms.forEach((arm,i)=>arm.rotation.x=animate&&moving?Math.sin(elapsed*10+i*Math.PI)*.35:0)
      packet.visible=Boolean(p.step);antenna.scale.setScalar(animate&&p.playing?1+Math.sin(elapsed*5)*.25:1)
      cubes.forEach((cube,i)=>{const exists=i<(p.step?.variables.length??0);cube.visible=exists;cube.position.y=.86+(animate&&p.playing?Math.sin(elapsed*3+i)*.06:0)})
      outputLamp.material=material(p.step?.output?'#a9e0a6':'#706c57')
      sparks.forEach((spark,i)=>{spark.visible=p.success;if(animate){spark.position.y=1.1+((elapsed*.45+i*.22)%1.8);spark.rotation.y=elapsed}})
      renderer.render(scene,camera)
      if(animate)raf=requestAnimationFrame(render)
    }
    const start=()=>{if(raf)cancelAnimationFrame(raf);last=performance.now();if(!document.hidden&&inView&&!lost)raf=requestAnimationFrame(render)}
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;const halfWidth=Math.max(4.6,3.1*w/h);camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();renderer.setSize(w,h);start()}
    const observer=new ResizeObserver(resize);observer.observe(el)
    const visible=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;start()});visible.observe(el)
    const onLost=(e:Event)=>{e.preventDefault();lost=true;if(raf)cancelAnimationFrame(raf);setFailed(true)}
    // A manual step must redraw even when ambient motion is disabled.
    const redraw=setInterval(()=>{if(!live.current.motion||query.matches)start()},200)
    document.addEventListener('visibilitychange',start);query.addEventListener('change',start);renderer.domElement.addEventListener('webglcontextlost',onLost)
    resize()
    return()=>{if(raf)cancelAnimationFrame(raf);clearInterval(redraw);observer.disconnect();visible.disconnect();document.removeEventListener('visibilitychange',start);query.removeEventListener('change',start);renderer.domElement.removeEventListener('webglcontextlost',onLost);scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()}
  },[])
  return <div className="workshop-visual"><div className="workshop-stations"><span>01 · Ввод</span><span>02 · Память</span><span>03 · Вывод</span></div><div ref={host} className="workshop-canvas" role="img" aria-label="Мастерская Искры: робот переносит данные между вводом, памятью и выводом" hidden={failed}/>{failed&&<p className="workshop-fallback">3D недоступно. Разбор строк и значений продолжает работать ниже.</p>}<span className="workshop-caption">{step?'Искра показывает шаги твоей программы':'Искра ждёт первую команду'}</span></div>
}

export function ProgramStage({result,source,demo,busy,onDemo,onStep}:{result:PythonResult|null;source:string;demo:boolean;busy:boolean;onDemo:()=>void;onStep:(line:number|undefined)=>void}) {
  const {progress}=useProgress()
  const frames=result?.trace??[]
  const [index,setIndex]=useState(0),[speed,setSpeed]=useState(1)
  const [playing,setPlaying]=useState(()=>Boolean(frames.length&&progress.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches))
  const step=frames[index],atEnd=index>=frames.length-1
  useLayoutEffect(()=>{onStep(!demo?step?.line:undefined);return()=>onStep(undefined)},[step,demo,onStep])
  useEffect(()=>{
    if(!playing||!frames.length)return
    const timer=setTimeout(()=>{if(atEnd)setPlaying(false);else setIndex(i=>i+1)},1200/speed)
    return()=>clearTimeout(timer)
  },[playing,atEnd,speed,index,frames.length])
  const successful=Boolean(result&&!result.error&&result.tests.length&&result.tests.every(t=>t.passed))
  const replay=()=>{setIndex(0);setPlaying(true)}
  const currentLine=step?source.split('\n')[step.line-1]??'':''
  return <section className="program-stage" aria-label="Пошаговое выполнение Python">
    <header><div><span className="reading-label">ЖИВОЙ КОД</span><h3>Мастерская Искры</h3></div><span className="stage-mode">{demo?'Учебный пример':result?'Твоя программа':'До запуска'}</span></header>
    <Workshop step={step} source={source} playing={playing} success={successful&&atEnd} motion={progress.motion}/>
    {!result?<div className="stage-intro"><strong>Посмотри, как оживает код</strong><p>Запусти свою программу или пример урока. Искра покажет порядок действий, значения и вывод.</p><button className="button secondary" type="button" onClick={onDemo} disabled={busy}><Play size={17}/>Показать пример в действии</button></div>:<>
      <div className="stage-controls"><button type="button" aria-label={playing?'Приостановить разбор':'Воспроизвести разбор'} disabled={!frames.length} onClick={()=>{if(!playing&&atEnd)replay();else setPlaying(v=>!v)}}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><button type="button" aria-label="Следующий шаг" disabled={atEnd||!frames.length} onClick={()=>{setPlaying(false);setIndex(i=>i+1)}}><SkipForward size={19}/></button><button type="button" aria-label="Повторить разбор" disabled={!frames.length} onClick={replay}><RotateCcw size={18}/></button><span>{frames.length?`${index+1} / ${frames.length}`:'Нет шагов'}</span><select aria-label="Скорость разбора" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></div>
      {step&&<div className="stage-step" key={index}><span>СТРОКА {step.line} · {step.scope==='<module>'?'основная программа':step.scope}</span><code>{currentLine.trim()}</code><p>{step.event==='exception'?'На этом шаге возникло исключение. Смотри обработку дальше или сообщение в консоли.':/\binput\s*\(/.test(currentLine)?'Программа получила текст из поля ввода.':/\bprint\s*\(/.test(currentLine)?'Сообщение отправлено в вывод.':/^\s*(for|while)\b/.test(currentLine)?'Проверяется следующий повтор цикла.':/^\s*(if|elif)\b/.test(currentLine)?'Условие выбирает, какая ветка выполнится.':'Состояние памяти после этой строки:'}</p></div>}
      {step&&<dl className="stage-memory" aria-label="Память на текущем шаге">{step.variables.length?step.variables.map(v=><div key={v.name}><dt>{v.name}<small>{v.type}</small></dt><dd>{v.value}</dd></div>):<div><dt>Память</dt><dd>Пока нет переменных</dd></div>}</dl>}
      {step?.output&&<div className="stage-output"><span>Вывод к этому шагу</span><pre>{step.output}</pre></div>}
      {result.traceTruncated&&<p className="stage-note">Показаны первые 120 шагов. Полный результат находится в консоли.</p>}
      {!frames.length&&<p className="stage-note">{result.error?'Исправь ошибку в консоли и запусти код снова.':'Добавь команду, чтобы увидеть выполнение.'}</p>}
    </>}
  </section>
}
