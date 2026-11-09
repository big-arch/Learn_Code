import {useEffect,useRef,useState} from 'react'
import * as THREE from 'three'
import type {Device,MechanismState} from '../lib/mechanisms'

interface Props {state:MechanismState;selected:Device;onSelect:(device:Device)=>void;motion:boolean;finished:boolean}
export function MechanismScene(props:Props) {
  const host=useRef<HTMLDivElement>(null),latest=useRef(props),[fallback,setFallback]=useState(false)
  const refresh=useRef<(()=>void)|null>(null)
  useEffect(()=>{latest.current=props;refresh.current?.()},[props])
  useEffect(()=>{
    if(!host.current)return
    const container=host.current
    let renderer:THREE.WebGLRenderer
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch{queueMicrotask(()=>setFallback(true));return}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25
    renderer.domElement.setAttribute('aria-hidden','true');container.appendChild(renderer.domElement)
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,5.4,-5.4,.1,70)
    camera.position.set(11,12,14);camera.lookAt(0,.8,0)
    scene.add(new THREE.HemisphereLight('#eff8e4','#365963',2.1))
    const sun=new THREE.DirectionalLight('#ffe3b4',3.2);sun.position.set(-6,12,5);sun.castShadow=true
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun)
    const mats=new Map<string,THREE.MeshStandardMaterial>()
    function mat(color:string){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));return mats.get(color)!}
    function mesh(g:THREE.BufferGeometry,c:string,x:number,y:number,z:number,parent:THREE.Object3D=scene){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
    const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=scene)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p)
    const cylinder=(r:number,h:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=scene)=>mesh(new THREE.CylinderGeometry(r,r,h,32),c,x,y,z,p)
    const group=(id:Device,x:number,z:number)=>{const g=new THREE.Group();g.position.set(x,0,z);g.userData.device=id;scene.add(g);return g}
    const sea=cylinder(8,.13,'#408f9b',0,-.55,0);sea.receiveShadow=false
    const earth=cylinder(5.7,.65,'#967b59',0,-.28,0);earth.scale.z=.84
    const sand=cylinder(5.72,.15,'#ded0a1',0,.1,0);sand.scale.z=.84
    const grass=cylinder(5.3,.08,'#9cae75',0,.22,0);grass.scale.z=.83
    // Timber platform: individual boards, nails and stone foundations.
    for(let i=0;i<17;i++){box(.43,.17,5.4,i%2?'#b98e5c':'#c49a66',-3.5+i*.44,.35,0);for(const z of [-2.5,2.5])cylinder(.025,.015,'#60665a',-3.5+i*.44,.445,z)}
    for(const x of [-3,0,3])for(const z of [-2.4,2.4])box(.55,.8,.55,'#7f8573',x,-.02,z)
    for(let i=0;i<4;i++)box(1.7,.16, .55,'#c39c6d',0,.25-i*.11,3+i*.44)
    // Workshop shelter behind the devices, with a tiled copper roof and tools.
    box(3.2,2.05,.24,'#e5d5b2',-.6,1.4,-2.35)
    for(const x of [-2.25,1.05])box(.18,2.5,.18,'#685846',x,1.45,-2.2)
    for(let r=0;r<5;r++)for(let c=0;c<8;c++){const tile=box(.43,.09,.43,(r+c)%3?'#b56f4e':'#ca8460',-2.18+c*.44,2.7+r*.12,-1.65-r*.39);tile.rotation.x=.3}
    box(2.2,.18,.8,'#765a3f',-.6,1.1,-1.8)
    for(const x of [-1.5,.3])box(.12,1,.12,'#5f5140',x,.63,-1.8)
    for(let i=0;i<4;i++){box(.08,.45,.06,'#597774',-1.1+i*.3,2.0,-2.19);box(.2,.09,.08,'#ccb58a',-1.1+i*.3,2.22,-2.18)}
    const beacon=group('power',2.7,-.5)
    cylinder(.92,.22,'#7b8981',0,.54,0,beacon)
    mesh(new THREE.CylinderGeometry(.5,.72,2.6,32),'#e8d8b6',0,1.85,0,beacon)
    for(const y of [1.2,2.0])cylinder(.67-y*.045,.17,'#b16e4f',0,y,0,beacon)
    cylinder(.72,.12,'#4a6662',0,3.2,0,beacon)
    const glow=new THREE.MeshStandardMaterial({color:'#f2cf7e',emissive:'#ffb747',emissiveIntensity:0,roughness:.3})
    const lantern=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.65,16),glow);lantern.position.y=3.6;beacon.add(lantern)
    for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.055,.8,.055,'#45625b',Math.cos(a)*.5,3.57,Math.sin(a)*.5,beacon)}
    mesh(new THREE.ConeGeometry(.85,.55,12),'#416d66',0,4.17,0,beacon);cylinder(.05,.28,'#d7bc77',0,4.53,0,beacon)
    const lights=Array.from({length:12},(_,i)=>{
      const material=new THREE.MeshStandardMaterial({color:'#e7ba62',emissive:'#ffd57f',emissiveIntensity:0})
      const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.18,.055),material);m.position.set(-.27+(i%3)*.27,.95+Math.floor(i/3)*.36,.65);beacon.add(m);return m
    })
    const turbine=group('speed',-2.65,-.6)
    mesh(new THREE.CylinderGeometry(.32,.55,2.5,12),'#cfbd95',0,1.62,0,turbine)
    mesh(new THREE.ConeGeometry(.68,.65,8),'#54837c',0,3.05,0,turbine)
    const blades=new THREE.Group();blades.position.set(0,2.65,.57);turbine.add(blades)
    const hub=cylinder(.19,.22,'#725638',0,0,0,blades);hub.rotation.x=Math.PI/2
    for(let i=0;i<4;i++){const wing=new THREE.Group();wing.rotation.z=i*Math.PI/2;blades.add(wing);box(.09,1.48,.09,'#796143',0,.6,0,wing);box(.3,.85,.055,'#eee1b9',.12,.96,0,wing);for(let j=0;j<4;j++)box(.31,.025,.07,'#a48c62',.12,.65+j*.2,.04,wing)}
    const pump=group('water',-1.85,1.45)
    cylinder(.85,.18,'#797b67',0,.55,0,pump)
    const water=new THREE.Mesh(new THREE.CylinderGeometry(.69,.69,1,32),new THREE.MeshStandardMaterial({color:'#53b2b1',roughness:.25,metalness:.15}));pump.add(water)
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,1.65,32,1,true),new THREE.MeshStandardMaterial({color:'#a4d8ca',transparent:true,opacity:.2,roughness:.1,side:THREE.DoubleSide,depthWrite:false}));shell.position.y=1.45;pump.add(shell)
    for(const y of [.65,2.25])cylinder(.82,.1,'#416e68',0,y,0,pump)
    for(let i=0;i<4;i++){const a=i*Math.PI/2;box(.075,1.65,.075,'#526f5c',Math.cos(a)*.78,1.45,Math.sin(a)*.78,pump)}
    const pipe=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.8,1,1.5),new THREE.Vector3(-.6,.8,1.6),new THREE.Vector3(.1,.65,1.2),new THREE.Vector3(.5,.6,1.6)])
    mesh(new THREE.TubeGeometry(pipe,24,.08,8,false),'#a47446',0,0,0)
    const valve=mesh(new THREE.TorusGeometry(.2,.045,8,20),'#bb694a',-.65,1.03,1.6);valve.rotation.x=Math.PI/2
    const sign=group('label',.7,1.6)
    for(const x of [-.67,.67])box(.1,1.4,.1,'#745c42',x,1,0,sign)
    box(1.8,.75,.12,'#72573b',0,1.7,0,sign)
    const labelCanvas=document.createElement('canvas');labelCanvas.width=768;labelCanvas.height=256
    const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace
    const labelMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.66,.57),new THREE.MeshBasicMaterial({map:texture}));labelMesh.position.set(0,1.7,.066);sign.add(labelMesh)
    let labelCache=''
    function writeLabel(text:string){const c=labelCanvas.getContext('2d');if(!c)return;c.fillStyle='#e9d9b0';c.fillRect(0,0,768,256);c.fillStyle='#294b43';c.textAlign='center';c.textBaseline='middle';c.font='bold 48px sans-serif';c.fillText(text||'Твоя мастерская',384,128,710);texture.needsUpdate=true}
    writeLabel('')
    // Keeper, bench, plants and the jetty give the workshop a lived-in scale.
    const keeper=new THREE.Group();keeper.position.set(.1,.46,-.7);scene.add(keeper)
    cylinder(.2,.5,'#bf805d',0,.5,0,keeper);mesh(new THREE.SphereGeometry(.21,20,16),'#e2bb8f',0,.94,0,keeper)
    cylinder(.33,.06,'#dcc792',0,1.1,0,keeper);cylinder(.21,.17,'#c8ac73',0,1.19,0,keeper)
    for(const x of [-.12,.12])box(.13,.27,.2,'#45635a',x,.16,0,keeper)
    const plants:THREE.Mesh[]=[]
    for(let i=0;i<7;i++){const x=-4.2+(i%3)*.5,z=-2.6+Math.floor(i/3)*.6; cylinder(.16,.35,'#af7953',x,.42,z);const leaf=mesh(new THREE.SphereGeometry(.27,12,10),'#65854e',x,.78,z);leaf.scale.set(.7,1.6,.7);plants.push(leaf)}
    for(const [x,z] of [[-4,1.2],[3.9,-2.1],[3.7,2]]){
      const front=z===2
      cylinder(.13,front?.35:1.1,'#806647',x,front?.35:.7,z);const tree=mesh(new THREE.IcosahedronGeometry(front?.5:.85,1),'#758e58',x,front?.8:1.8,z);tree.scale.y=front?1:1.4
    }
    for(let i=0;i<6;i++)box(.85,.1,.38,'#c3a477',3.7,0,2.9+i*.36)
    const boat=mesh(new THREE.CapsuleGeometry(.3,1,4,12),'#a67049',3.2,-.16,4.8);boat.rotation.z=Math.PI/2;boat.rotation.y=.35;boat.scale.z=.6
    const ring=mesh(new THREE.TorusGeometry(1.08,.035,8,64),'#f5c66d',0,.49,0);ring.rotation.x=Math.PI/2
    const positions:Record<Device,THREE.Vector3>={power:beacon.position,water:pump.position,speed:turbine.position,label:sign.position}
    let dirty=true,visible=true,last=0,frame=0
    const reduced=matchMedia('(prefers-reduced-motion: reduce)')
    refresh.current=()=>{dirty=true}
    function draw(now:number){
      frame=requestAnimationFrame(draw);const dt=Math.min(.04,(now-last)/1000);last=now
      if(!visible||document.hidden)return
      const {state,selected,motion,finished}=latest.current,animate=motion&&!reduced.matches
      if(!dirty&&!animate)return
      dirty=false
      glow.emissiveIntensity=state.power/12*2.4
      lights.forEach((m,i)=>{m.material.emissiveIntensity=i<state.power?2:0;m.material.color.set(i<state.power?'#ffe4a1':'#62736a')})
      water.scale.y=Math.max(.01,state.water/10*1.5);water.position.set(0,.7+water.scale.y/2,0)
      blades.rotation.z-=animate?dt*state.speed*.55:0
      if(!animate)blades.rotation.z=-state.speed*.15
      if(state.label!==labelCache){labelCache=state.label;writeLabel(state.label)}
      ring.position.set(positions[selected].x,.49,positions[selected].z)
      plants.forEach((p,i)=>{p.scale.y=(finished?1.9:1.6)+(animate&&state.water?Math.sin(now*.0015+i)*.04:0)})
      renderer.render(scene,camera)
    }
    function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;const half=Math.max(5.5,6.9*h/w);camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true}
    const ro=new ResizeObserver(resize);ro.observe(container);resize()
    const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;dirty=true});io.observe(container)
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2()
    const pick=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects([beacon,pump,turbine,sign],true)){let o:THREE.Object3D|null=hit.object;while(o&&!o.userData.device)o=o.parent;if(o){latest.current.onSelect(o.userData.device);return}}}
    renderer.domElement.addEventListener('pointerup',pick)
    const lost=(e:Event)=>{e.preventDefault();setFallback(true);visible=false};renderer.domElement.addEventListener('webglcontextlost',lost)
    frame=requestAnimationFrame(draw)
    return()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();refresh.current=null;renderer.domElement.removeEventListener('pointerup',pick);renderer.domElement.removeEventListener('webglcontextlost',lost);const materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();renderer.domElement.remove()}
  },[])
  return <div className="mechanism-scene" ref={host} role="img" aria-label={`Мастерская на острове. Фонарь: ${props.state.power}, вода: ${props.state.water}, турбина: ${props.state.speed}. ${props.state.label}`}>
    {fallback&&<div className="mechanism-fallback"><span aria-hidden="true">⚙</span><h3>Пульт мастерской</h3><p>3D недоступно на этом устройстве. Все задания работают: значения и состояние устройств показаны ниже.</p><div>Фонарь: {props.state.power}/12 · Бак: {props.state.water}/10 · Скорость: {props.state.speed}/8</div><strong>{props.state.label||'Табличка пока пуста'}</strong></div>}
  </div>
}
