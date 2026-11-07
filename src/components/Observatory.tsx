import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useProgress } from '../state/useProgress'
interface Props { chapter?: number; progress?: number; compact?: boolean; onChapter?: (chapter: number) => void; variables?: { name: string; type: string; value: string }[] }
const colors = ['#efb46d', '#81b7b0', '#bca6d3', '#db947d', '#95b991', '#a5b9d6']
export function Observatory({ chapter = 0, progress = 0, compact = false, onChapter, variables = [] }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const callback = useRef(onChapter)
  const { progress: settings } = useProgress()
  const [failed, setFailed] = useState(false)
  useEffect(() => { callback.current = onChapter }, [onChapter])
  const values = JSON.stringify(variables.slice(0, 5))
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' }) }
    catch { queueMicrotask(() => setFailed(true)); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    renderer.setClearColor('#111a29', 0)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(8, 7.5, 10.5); camera.lookAt(0, 0.5, 0)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.6, 0); controls.enablePan = false; controls.enableZoom = false
    controls.enableDamping = true; controls.dampingFactor = 0.07
    controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.4
    scene.add(new THREE.HemisphereLight('#bed9ed', '#403b4e', 2.5))
    const sun = new THREE.DirectionalLight('#ffe2b7', 4.5)
    sun.position.set(-3, 8, 5); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6
    sun.shadow.bias = -0.001; scene.add(sun)
    const fill = new THREE.PointLight('#739ccc', 16, 20); fill.position.set(4, 3, -4); scene.add(fill)
    const world = new THREE.Group(); scene.add(world)
    const make = (geometry: THREE.BufferGeometry, color: string, parent: THREE.Object3D = world, emissive = 0) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.16, emissive: color, emissiveIntensity: emissive }))
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    const at = (m: THREE.Object3D, x: number, y: number, z: number) => { m.position.set(x, y, z); return m }
    at(make(new THREE.CylinderGeometry(3.15, 2.95, 0.34, 64), '#9f8273'), 0, -0.25, 0)
    at(make(new THREE.CylinderGeometry(3.24, 3.16, 0.13, 64), '#c4baa2'), 0, -0.03, 0)
    at(make(new THREE.CylinderGeometry(2.98, 2.7, 0.7, 12), '#384650'), 0, -0.75, 0)
    at(make(new THREE.ConeGeometry(2.7, 2.2, 9), '#24313d'), 0, -2.15, 0).rotation.z = Math.PI
    for (let i = 0; i < 4; i++) at(make(new THREE.BoxGeometry(0.85, 0.16, 0.44), '#aaa18e'), 0, -0.15 - i * 0.14, 2.65 + i * 0.28)
    // Radial floor inlays and softly lit perimeter.
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2
      const line = make(new THREE.BoxGeometry(0.015, 0.015, 1.3), '#8f8f83')
      line.position.set(Math.sin(angle) * 2.25, 0.045, Math.cos(angle) * 2.25); line.rotation.y = angle
      if (i % 3 === 0) {
        at(make(new THREE.CylinderGeometry(0.065, 0.065, 0.48, 10), '#39444c'), Math.sin(angle)*2.94, 0.3, Math.cos(angle)*2.94)
        at(make(new THREE.SphereGeometry(0.1, 12, 10), '#ffd699', world, 2), Math.sin(angle)*2.94, 0.6, Math.cos(angle)*2.94)
      }
    }
    const instrument = new THREE.Group(); at(instrument, 0, 0.12, -0.15); world.add(instrument)
    make(new THREE.CylinderGeometry(0.6, 0.82, 0.22, 32), '#44585a', instrument)
    at(make(new THREE.CylinderGeometry(0.25, 0.38, 0.65, 24), '#b99a6b', instrument),0,0.35,0)
    const orb = at(make(new THREE.SphereGeometry(0.78, 48, 32), '#709aa5', instrument, 0.12), 0, 1.5, 0)
    const bands: THREE.Mesh[] = []
    for (let i=0;i<3;i++) {
      const ring=make(new THREE.TorusGeometry(1.1+i*0.15,0.032,10,96),'#dbb77e',instrument)
      ring.position.y=1.5;ring.rotation.set(0.7+i*0.8,0.2+i,0.4);bands.push(ring)
    }
    const smallStars = new THREE.BufferGeometry()
    const coordinates = []
    for(let i=0;i<90;i++){const a=i*2.3999; const radius=4+(i%13)*0.26; coordinates.push(Math.cos(a)*radius,1+(i%17)*0.27,Math.sin(a)*radius)}
    smallStars.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3))
    scene.add(new THREE.Points(smallStars,new THREE.PointsMaterial({color:'#e7ca9a',size:0.035,transparent:true,opacity:0.8})))
    const chapterSpheres: THREE.Mesh[] = []
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2+Math.PI/6
      const x=Math.sin(a)*2.15,z=Math.cos(a)*2.15
      at(make(new THREE.CylinderGeometry(0.26,0.31,0.16,24),'#667172'),x,0.13,z)
      const sphere=make(new THREE.IcosahedronGeometry(i===chapter?0.24:0.18,2),colors[i],world,i===chapter?0.8:0.15)
      sphere.position.set(x,0.62,z);sphere.userData.chapter=i;chapterSpheres.push(sphere)
      if(i===chapter){const r=make(new THREE.TorusGeometry(0.37,0.012,6,48),colors[i]);r.rotation.x=Math.PI/2;r.position.set(x,0.23,z)}
    }
    // Reading desk, stool, books, telescope, plant and a small companion.
    const desk=make(new THREE.BoxGeometry(1.25,0.1,0.62),'#8d6a50');desk.position.set(-1.55,0.75,-1.25);desk.rotation.y=-0.3
    for(const x of [-2,-1.1])at(make(new THREE.CylinderGeometry(0.045,0.045,0.7,8),'#37444b'),x,0.37,-1.25)
    for(let i=0;i<3;i++){const b=make(new THREE.BoxGeometry(0.36,0.065,0.26),colors[i]);b.position.set(-1.65,0.85+i*0.07,-1.3);b.rotation.y=i*0.15}
    at(make(new THREE.CylinderGeometry(0.22,0.22,0.13,24),'#b68162'),-1.4,0.45,-0.55)
    at(make(new THREE.CylinderGeometry(0.045,0.07,0.4,12),'#405359'),-1.4,0.2,-0.55)
    const telescope=new THREE.Group();telescope.position.set(1.5,0.9,-1.6);telescope.rotation.z=-0.7;world.add(telescope)
    make(new THREE.CylinderGeometry(0.17,0.23,0.95,24),'#d9c7a2',telescope)
    at(make(new THREE.CylinderGeometry(0.175,0.175,0.04,24),'#587d9b',telescope,0.4),0,0.5,0)
    for(let i=0;i<3;i++){const leg=make(new THREE.CylinderGeometry(0.035,0.035,0.9,8),'#a98b6b');leg.position.set(1.5+Math.cos(i*2.09)*0.16,0.4,-1.6+Math.sin(i*2.09)*0.16);leg.rotation.z=Math.cos(i*2.09)*0.35;leg.rotation.x=Math.sin(i*2.09)*0.35}
    for(const [x,z] of [[-2.35,0.4],[2.25,0.4]]){
      at(make(new THREE.CylinderGeometry(0.23,0.16,0.35,18),'#b98b72'),x,0.2,z)
      for(let i=0;i<5;i++){const leaf=make(new THREE.SphereGeometry(0.18,12,8),'#7e9b87');leaf.scale.set(0.55,1.8,0.6);leaf.position.set(x+Math.cos(i*1.25)*0.13,0.62,z+Math.sin(i*1.25)*0.13);leaf.rotation.z=Math.cos(i*1.25)*0.5}
    }
    const robot=new THREE.Group();robot.position.set(0.9,0,1.1);robot.rotation.y=-0.35;world.add(robot)
    at(make(new THREE.BoxGeometry(0.32,0.4,0.28),'#e8d8b9',robot),0,0.38,0)
    at(make(new THREE.BoxGeometry(0.44,0.3,0.35),'#e7d2b5',robot),0,0.77,0)
    at(make(new THREE.BoxGeometry(0.34,0.15,0.02),'#344f55',robot),0,0.8,0.18)
    for(const x of [-0.1,0.1]){at(make(new THREE.BoxGeometry(0.055,0.045,0.02),'#f1be79',robot,1),x,0.81,0.2);at(make(new THREE.BoxGeometry(0.12,0.12,0.2),'#617675',robot),x,0.08,0)}
    const labels: {name:string;type:string;value:string}[]=JSON.parse(values)
    const labelTextures: THREE.Texture[]=[]
    if(compact && labels.length){
      instrument.visible=false
      labels.forEach((value,i)=>{
        const x=(i-(labels.length-1)/2)*0.85
        const block=make(new THREE.BoxGeometry(0.7,0.65,0.7),colors[i%6],world,0.12);block.position.set(x,0.5,0)
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192
        const ctx=canvas.getContext('2d')!
        ctx.fillStyle='#1d2935';ctx.fillRect(0,0,512,192);ctx.textAlign='center'
        ctx.fillStyle='#f4dec0';ctx.font='bold 36px sans-serif';ctx.fillText(value.name,256,55)
        ctx.fillStyle='#c3d6d9';ctx.font='28px monospace';ctx.fillText(value.value.slice(0,18),256,105)
        ctx.fillStyle='#9cacae';ctx.font='24px sans-serif';ctx.fillText(value.type,256,151)
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;labelTextures.push(texture)
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(x,1.2,0);sprite.scale.set(1.25,0.47,1);world.add(sprite)
      })
    }
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2()
    let downX=0,downY=0
    const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY}
    const click=(e:PointerEvent)=>{
      if(Math.hypot(e.clientX-downX,e.clientY-downY)>7)return
      const bounds=host.getBoundingClientRect();pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1)
      ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(chapterSpheres)[0]
      if(hit)callback.current?.(hit.object.userData.chapter)
    }
    host.addEventListener('pointerdown',down);host.addEventListener('pointerup',click)
    const query=matchMedia('(prefers-reduced-motion: reduce)')
    let reduced=query.matches,inView=true,frame=0,elapsed=0,last=performance.now()
    const render=()=>renderer.render(scene,camera)
    const animate=(now:number)=>{frame=0;if(document.hidden||!inView)return;const dt=Math.min((now-last)/1000,0.05);last=now
      if(settings.motion&&!reduced){elapsed+=dt;orb.rotation.y+=dt*0.12;bands[0].rotation.y+=dt*0.08;chapterSpheres.forEach((s,i)=>{s.position.y=0.62+Math.sin(elapsed*0.8+i)*0.07});controls.autoRotate=!compact;controls.autoRotateSpeed=0.14}
      else controls.autoRotate=false
      controls.update();render()
      if(settings.motion&&!reduced)frame=requestAnimationFrame(animate)
    }
    const start=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();if(!document.hidden&&inView)frame=requestAnimationFrame(animate)}
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);render()}
    const resized=new ResizeObserver(resize);resized.observe(host)
    const visible=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;start()});visible.observe(host)
    const motion=(e:MediaQueryListEvent)=>{reduced=e.matches;start()}
    const lost=(e:Event)=>{e.preventDefault();setFailed(true);if(frame)cancelAnimationFrame(frame)}
    renderer.domElement.addEventListener('webglcontextlost',lost)
    controls.addEventListener('change',render);document.addEventListener('visibilitychange',start);query.addEventListener('change',motion)
    resize();start()
    // Progress is represented by the completed orbit segments.
    for(let i=0;i<24*progress;i++){const r=make(new THREE.TorusGeometry(2.75,0.018,6,12,Math.PI/16),'#ffd398',world,0.7);r.rotation.x=Math.PI/2;r.rotation.z=i*Math.PI/12;r.position.y=0.08}
    return ()=>{if(frame)cancelAnimationFrame(frame);resized.disconnect();visible.disconnect();controls.dispose();document.removeEventListener('visibilitychange',start);query.removeEventListener('change',motion);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('webglcontextlost',lost);labelTextures.forEach(t=>t.dispose());scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}if(o instanceof THREE.Sprite)o.material.dispose()});renderer.dispose();renderer.domElement.remove()}
  },[chapter,progress,compact,settings.motion,values])
  return <div className={'observatory '+(compact?'compact':'')}><div ref={hostRef} className="observatory-canvas" role="img" aria-label="Объёмная учебная обсерватория: планета с орбитами, телескоп, робот и шесть спутников глав" hidden={failed}/>{failed&&<div className="observatory-fallback"><span>✦</span><strong>Твоя обсерватория знаний</strong><p>3D недоступно. Все уроки, теория и Python продолжают работать.</p></div>}<span className="scene-caption">{compact?'Значения программы становятся видимыми':'Перетащи сцену · нажми на спутник главы'}</span></div>
}
