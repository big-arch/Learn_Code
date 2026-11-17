import { useEffect,useRef,useState } from 'react'
import * as THREE from 'three'
import type { Sensors } from '../lib/greenhouse'
interface Props{water:boolean|null;fan:boolean|null;mode:string;sensors:Sensors;motion:boolean}
export function GreenhouseScene(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),dirty=useRef(true),[fallback,setFallback]=useState(false)
 useEffect(()=>{latest.current=props;dirty.current=true},[props])
 useEffect(()=>{
  const target=host.current;if(!target)return
  let renderer:THREE.WebGLRenderer
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch{queueMicrotask(()=>setFallback(true));return}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18
  renderer.domElement.setAttribute('aria-hidden','true');target.appendChild(renderer.domElement)
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6,6,5,-5,.1,80)
  camera.position.set(10,9,12);camera.lookAt(0,1,0)
  scene.add(new THREE.HemisphereLight('#eff9e6','#3e6861',2.5))
  const sun=new THREE.DirectionalLight('#ffe5b5',3);sun.position.set(-4,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:35});sun.shadow.normalBias=.035;scene.add(sun)
  const mats=new Map<string,THREE.MeshStandardMaterial>()
  const mat=(c:string)=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.7}));return mats.get(c)!}
  const mesh=(g:THREE.BufferGeometry,c:string,x:number,y:number,z:number,p:THREE.Object3D=scene)=>{const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m}
  const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=scene)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p)
  const cyl=(r:number,h:number,c:string,x:number,y:number,z:number,p:THREE.Object3D=scene)=>mesh(new THREE.CylinderGeometry(r,r,h,24),c,x,y,z,p)
  const beam=(a:THREE.Vector3,b:THREE.Vector3,r=.045)=>{const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),'#e0c799',0,0,0);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m}
  const base=cyl(5,.55,'#bca786',0,-.3,0);base.scale.z=.78
  const top=cyl(5.02,.15,'#b8c790',0,.06,0);top.scale.z=.78
  box(5.3,.3,4.9,'#8e9983',0,.2,-.3);box(5.1,.12,4.7,'#e4d8b6',0,.4,-.3)
  for(let i=0;i<9;i++)box(.48,.045,4.4,i%2?'#cbb88c':'#d7c49a',-2+i*.5,.49,-.3)
  // Open front and transparent back keep plants and water readable.
  const glass=new THREE.MeshStandardMaterial({color:'#b9e1ca',transparent:true,opacity:.13,roughness:.18,side:THREE.DoubleSide,depthWrite:false})
  for(const z of [-2.5,0,1.9]){
   for(const x of [-2.4,2.4]){box(.09,2.8,.09,'#e0c799',x,1.9,z);beam(new THREE.Vector3(x,3.3,z),new THREE.Vector3(0,4.3,z))}
  }
  for(const x of [-2.4,2.4])for(const y of [1.9,3.3])box(.07,.07,4.5,'#e0c799',x,y,-.3)
  box(.1,.1,4.6,'#719080',0,4.3,-.3)
  const back=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.8),glass);back.position.set(0,1.9,-2.49);scene.add(back)
  for(const side of [-1,1]){const roof=new THREE.Mesh(new THREE.PlaneGeometry(2.6,4.4),glass);roof.rotation.x=-Math.PI/2;roof.rotation.y=side*.39;roof.position.set(side*1.2,3.8,-.3);scene.add(roof)}
  const plants:THREE.Group[]=[],soil:THREE.Mesh[]=[]
  for(const x of [-1.4,1.4]){
   box(1.5,.45,3.7,'#a97751',x,.7,-.2);const earth=box(1.34,.07,3.55,'#725b41',x,.96,-.2);earth.material=mat('#725b41').clone();soil.push(earth)
   for(const z of [-1.4,-.25,.9]){
    const plant=new THREE.Group();plant.position.set(x,1,z);scene.add(plant);plants.push(plant)
    cyl(.035,.8,'#658750',0,.4,0,plant)
    for(let j=0;j<5;j++){const leaf=mesh(new THREE.SphereGeometry(.22,12,8),j%2?'#67994f':'#86b960',Math.cos(j*2.4)*.18,.15+j*.14,Math.sin(j*2.4)*.18,plant);leaf.scale.set(1.5,.25,.7);leaf.rotation.z=j%2?.4:-.4;leaf.rotation.y=j*2.4}
    if(x<0)for(let j=0;j<3;j++)mesh(new THREE.SphereGeometry(.12,12,10),'#db8356',Math.cos(j*2)*.2,.5+j*.09,Math.sin(j*2)*.2,plant)
   }
  }
  // Brass water main and suspended spray heads.
  for(const x of [-1.4,1.4]){box(.06,.06,3.5,'#7eaaa0',x,2.35,-.25);for(const z of [-1.4,-.25,.9]){cyl(.13,.09,'#4f7a72',x,2.26,z);beam(new THREE.Vector3(x,2.4,z),new THREE.Vector3(x,3.6,z),.017)}}
  box(3,.06,.06,'#7eaaa0',0,2.35,-2)
  const drops:THREE.Mesh[]=[]
  for(let i=0;i<48;i++){const drop=mesh(new THREE.SphereGeometry(.027,6,4),'#95dce5',(i%2?-1.4:1.4)+Math.sin(i*7)*.38,1+(i%8)*.15,-1.4+(i%3)*1.15+Math.cos(i*5)*.32);drop.castShadow=false;drops.push(drop)}
  const fan=new THREE.Group();fan.position.set(0,2.7,-2.42);scene.add(fan)
  const rim=mesh(new THREE.TorusGeometry(.54,.055,8,32),'#749a87',0,0,0,fan);rim.castShadow=false
  const rotor=new THREE.Group();fan.add(rotor)
  for(let j=0;j<4;j++){const blade=box(.18,.43,.04,'#b3c5ae',0,.24,.03,rotor);blade.position.set(Math.sin(j*Math.PI/2)*.24,Math.cos(j*Math.PI/2)*.24,.03);blade.rotation.z=-j*Math.PI/2+.35}
  const hub=cyl(.13,.1,'#477469',0,0,.07,fan);hub.rotation.x=Math.PI/2
  // Tank, level gauge, sensor mast, tools and stepping stones.
  cyl(.62,1.6,'#678e7f',3.3,.98,-1.6)
  for(const y of [.3,1.6])cyl(.66,.1,'#d8bc83',3.3,y,-1.6)
  const gauge=box(.1,1.25,.09,'#8fd5d4',3.3,1,-.97)
  for(let i=0;i<6;i++)box(.18,.025,.05,'#e8d7ac',3.5,.42+i*.19,-.98)
  beam(new THREE.Vector3(3.3,.6,-1.6),new THREE.Vector3(3.3,2.35,-1.6),.06);beam(new THREE.Vector3(3.3,2.35,-1.6),new THREE.Vector3(1.4,2.35,-2),.06)
  cyl(.06,1.3,'#6b7663',-.2,.9,1.4);box(.48,.55,.14,'#eee1b9',-.2,1.6,1.4)
  const lamp=mesh(new THREE.SphereGeometry(.08,12,8),'#c4ad63',-.2,1.72,1.5);lamp.material=mat('#c4ad63').clone()
  for(let i=0;i<4;i++)box(.7,.08,.4,'#dfd5ba',-.1,.18,2.3+i*.43)
  for(let i=0;i<7;i++){const x=-3.5+Math.sin(i*4)*.6,z=-1.6+i*.5;const shrub=mesh(new THREE.IcosahedronGeometry(.32,1),'#7c9b59',x,.35,z);shrub.scale.y=.65}
  const bench=box(1.2,.1,.6,'#a87e53',3.1,.7,1.25);for(const x of [2.65,3.55])box(.09,.6,.5,'#886749',x,.38,1.25)
  bench.receiveShadow=true
  cyl(.18,.28,'#c0875c',3.2,.89,1.25);mesh(new THREE.SphereGeometry(.22,12,8),'#89aa60',3.2,1.18,1.25)
  let visible=true,frame=0,last=0,rotation=0
  const reduced=matchMedia('(prefers-reduced-motion: reduce)')
  function draw(now:number){
   frame=requestAnimationFrame(draw);const dt=Math.min(.04,(now-last)/1000);last=now
   if(!visible||document.hidden)return
   const p=latest.current,animate=p.motion&&!reduced.matches
   if(!dirty.current&&(!animate||(!p.fan&&!p.water)))return
   dirty.current=false
   rotation+=p.fan&&animate?dt*3:0;rotor.rotation.z=rotation
   drops.forEach((d,i)=>{d.visible=p.water===true;d.position.y=animate?2.2-((now*.0007+i*.071)%1.15):1.25+(i%6)*.13})
   plants.forEach((plant,i)=>{plant.rotation.z=animate&&p.fan?Math.sin(now*.002+i)*.035:0})
   soil.forEach(m=>(m.material as THREE.MeshStandardMaterial).color.set(p.water?'#514c38':'#725b41'))
   gauge.scale.y=Math.max(.01,Math.min(1,p.sensors.tank/10));gauge.position.y=.4+.625*gauge.scale.y
   ;(lamp.material as THREE.MeshStandardMaterial).color.set(p.mode==='ошибка'?'#d47a60':p.water?'#a4cf70':'#c4ad63')
   renderer.render(scene,camera)
  }
  function resize(){const w=target!.clientWidth,h=target!.clientHeight;if(!w||!h)return;const half=Math.max(4.5,5.7*h/w);camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty.current=true}
  const ro=new ResizeObserver(resize),io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;dirty.current=true});ro.observe(target);io.observe(target);resize()
  const refresh=()=>{dirty.current=true},lost=(e:Event)=>{e.preventDefault();setFallback(true);visible=false}
  reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);renderer.domElement.addEventListener('webglcontextlost',lost);frame=requestAnimationFrame(draw)
  return()=>{cancelAnimationFrame(frame);ro.disconnect();io.disconnect();reduced.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);renderer.domElement.removeEventListener('webglcontextlost',lost);const materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()}
 },[])
 return <div className="green-scene" ref={host} role="img" aria-label={`Теплица. Полив: ${props.water===null?'ещё не задан':props.water?'включён':'выключен'}. Вентилятор: ${props.fan===null?'ещё не задан':props.fan?'включён':'выключен'}. ${props.mode}`}>
  {fallback&&<div className="green-fallback"><span aria-hidden="true">🌱</span><h3>Пульт теплицы</h3><p>На этом устройстве используем облегчённый режим. Python, датчики и проверки работают полностью.</p></div>}
 </div>
}
