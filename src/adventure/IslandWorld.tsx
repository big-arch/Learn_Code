import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { islandQuests } from '../data/adventure'
import { buildings, trees, SPAWN, findPath, movePlayer } from './world'
import type { Position, WorldState } from './world'

interface Props {
  completed: string[]; event: number | null; paused: boolean; motion: boolean; zoom: number
  direction: { x: number; y: number }; destination: { index: number; serial: number } | null
  onPosition: (position: Position, nearby: number | null) => void
  onInteract: (index: number) => void
  onUnavailable: () => void
}
export function IslandWorld(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const live = useRef(props)
  const [failed, setFailed] = useState(false)
  useEffect(() => { live.current = props }, [props])
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }) }
    catch { queueMicrotask(()=>{setFailed(true);live.current.onUnavailable()});return }
    renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor('#9cccd2')
    renderer.domElement.setAttribute('aria-hidden','true')
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-12,12,8,-8,0.1,100)
    scene.add(new THREE.HemisphereLight('#e8f4ff','#37513d',1.6))
    const sunlight = new THREE.DirectionalLight('#fff1d9',2.6)
    sunlight.position.set(-8,18,9);sunlight.castShadow=true
    sunlight.shadow.mapSize.set(2048,2048)
    Object.assign(sunlight.shadow.camera,{left:-18,right:18,top:15,bottom:-15,near:1,far:50})
    sunlight.shadow.bias=-0.0005
    scene.add(sunlight)
    const materials = new Map<string,THREE.MeshStandardMaterial>()
    const material = (color:string) => {
      if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:0.87,flatShading:true}))
      return materials.get(color)!
    }
    const mesh = (geometry:THREE.BufferGeometry,color:string,parent:THREE.Object3D=scene) => {
      const obj = new THREE.Mesh(geometry,material(color));obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj
    }
    const box = (x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:THREE.Object3D=scene) => {
      const obj=mesh(new THREE.BoxGeometry(w,h,d),color,parent);obj.position.set(x,y,z);return obj
    }
    const cylinder = (x:number,y:number,z:number,top:number,bottom:number,h:number,color:string,parent:THREE.Object3D=scene,n=16) => {
      const obj=mesh(new THREE.CylinderGeometry(top,bottom,h,n),color,parent);obj.position.set(x,y,z);return obj
    }
    const sphere = (x:number,y:number,z:number,r:number,color:string,parent:THREE.Object3D=scene) => {
      const obj=mesh(new THREE.IcosahedronGeometry(r,1),color,parent);obj.position.set(x,y,z);return obj
    }
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms:{time:{value:0}},
      vertexShader:'varying vec2 pos; void main(){pos=(modelMatrix*vec4(position,1.)).xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float time; varying vec2 pos; void main(){float wave=sin(pos.y*5.+sin(pos.x*.9+time*.4)*.55+time*.3);float dash=smoothstep(.65,.9,sin(pos.x*1.8+pos.y*.4));float ripple=smoothstep(.985,1.,wave)*dash;vec3 base=mix(vec3(.035,.32,.39),vec3(.08,.48,.51),sin(pos.y*.13)*.5+.5);gl_FragColor=vec4(base+ripple*.12,1.);}'
    })
    const water=new THREE.Mesh(new THREE.PlaneGeometry(130,130),waterMaterial)
    water.rotation.x=-Math.PI/2;water.position.y=-0.65;scene.add(water)
    const island=cylinder(0,-0.55,0,13.2,12.5,1,'#a47745',scene,64);island.scale.z=0.7
    const beach=cylinder(0,-0.02,0,13,13.2,0.18,'#ecd6a6',scene,64);beach.scale.z=0.7
    const grass=cylinder(-0.1,0.08,-0.1,12.35,12.65,0.18,'#6e9b4d',scene,64);grass.scale.z=0.7
    const river=new THREE.Mesh(new THREE.PlaneGeometry(3.4,20),waterMaterial)
    river.rotation.x=-Math.PI/2;river.position.set(3.5,0.19,0);scene.add(river)
    // Pebbles and stepping stones give the paths a hand-made look.
    for(const [x,z] of [[-9,4],[-9,3],[-8,1.6],[-7,1],[-6,0.8],[-4,0],[-2,0],[-1,0],[0,0],[5.7,0],[6.4,-0.5],[7,-1],[7.5,-1.6]]) {
      const stone=cylinder(x,0.23,z,0.33,0.39,0.1,'#d9d0ac',scene,7);stone.scale.z=0.65;stone.rotation.y=x
    }
    // Docks at the arrival beach.
    for(let i=0;i<7;i++)box(-9,0.12,5.5+i*.36,1.7,0.13,.31,'#b28b60')
    for(const x of [-9.7,-8.3])for(const z of [5.5,7.65])cylinder(x,-0.2,z,.09,.1,1.4,'#795f4c')
    const sail=box(-10.2,0.3,7.25,.8,.26,1.7,'#d6b57f');sail.rotation.y=.2
    cylinder(-10.2,1.3,7.25,.035,.035,2,'#6c6458')
    const flag=mesh(new THREE.PlaneGeometry(.8,.9),'#f1e7cd');flag.position.set(-9.8,1.8,7.25)
    const doorLights: THREE.Mesh[]=[]
    for(const b of buildings) {
      if(b.kind==='lighthouse')continue
      box(b.x,1.15,b.z,b.width,1.9,b.depth,b.color)
      box(b.x,.32,b.z,b.width+.14,.26,b.depth+.14,'#7c694b')
      for(const dx of [-b.width/2,b.width/2])box(b.x+dx,1.2,b.z+b.depth/2+.055,.12,1.85,.14,'#79523a')
      box(b.x,2.08,b.z,b.width+.25,.13,b.depth+.2,'#744932')
      for(let i=0;i<5;i++)box(b.x-b.width/2+i*b.width/4,.35,b.z+b.depth/2+.5,.035,.03,.8,'#82603f')
      // Four-sided roof, rotated into a gable-like silhouette.
      const roof=mesh(new THREE.ConeGeometry(2.05,1.3,4),b.roof);roof.position.set(b.x,2.65,b.z);roof.rotation.y=Math.PI/4;roof.scale.z=b.depth/b.width
      box(b.x,0.7,b.z+b.depth/2+.025,.64,1.12,.09,'#375548')
      sphere(b.x+.21,.8,b.z+b.depth/2+.1,.055,'#efb653')
      for(const dx of [-.85,.85]) {
        box(b.x+dx,1.42,b.z+b.depth/2+.06,.49,.54,.09,'#586f65')
        const window=box(b.x+dx,1.42,b.z+b.depth/2+.12,.34,.39,.04,'#ffe1a3');doorLights.push(window)
        box(b.x+dx,1.42,b.z+b.depth/2+.15,.04,.42,.03,'#e8d2a0')
      }
      box(b.x-.7,2.85,b.z-.45,.36,1,.4,'#cbb894')
      // Front porch, crates and work bench.
      box(b.x,.25,b.z+b.depth/2+.5,b.width+.35,.16,.8,'#c1a079')
      box(b.x+1.2,.52,b.z+1.8,.6,.65,.65,'#ba9167')
      box(b.x+.9,.85,b.z+1.7,.65,.08,.5,'#ead6a4')
    }
    for(let i=0;i<trees.length;i++) {
      const [x,z]=trees[i]
      cylinder(x,.8,z,.15,.23,1.5,'#8d7756')
      const canopy=sphere(x,2,z,1.02,i%4===0?'#df9277':i%3===0?'#307343':'#508b44')
      canopy.scale.y=1.1
      sphere(x-.48,1.65,z+.2,.65,i%4===0?'#efae84':'#6ba451')
      sphere(x+.45,1.85,z-.1,.65,i%4===0?'#e99b80':'#88b35a')
      if(i%4!==0)for(let j=0;j<3;j++)sphere(x+Math.cos(j*2.1)*.65,1.95,z+Math.sin(j*2.1)*.65,.095,'#d49b67')
    }
    for(let i=0;i<65;i++) {
      const x=Math.sin(i*4.7)*11.5,z=Math.cos(i*2.7)*7
      if(Math.abs(x-3.5)<2||Math.abs(x+3)<.8||Math.abs(z)<1.4)continue
      if((x/12)**2+(z/8)**2>.92)continue
      const flower=sphere(x,.3,z,.1,i%3===0?'#edce8a':i%3===1?'#e9c8b5':'#dce4b9');flower.castShadow=false
    }
    // Fence and gate are real collision boundaries, not painted obstacles.
    for(let z=-7.5;z<=7.5;z+=.65)if(Math.abs(z)>1.35) {
      box(-3,.78,z,.15,1.2,.15,'#9a835e')
      box(-3,.75,z,.13,.13,.75,'#c0a575')
    }
    const gate=new THREE.Group();scene.add(gate);gate.position.set(-3,0,0)
    for(let z=-.9;z<=.9;z+=.3)box(0,.85,z,.16,1.25,.16,'#9b8058',gate)
    box(0,1.1,0,.2,.16,2.25,'#d0b17c',gate);box(0,.45,0,.2,.16,2.25,'#d0b17c',gate)
    cylinder(-3,1.15,-1.25,.15,.19,2,'#8a785d');cylinder(-3,1.15,1.25,.15,.19,2,'#8a785d')
    const bridge=new THREE.Group();scene.add(bridge)
    for(let i=0;i<6;i++)box(2.05+i*.58,.31,0,.54,.18,2.05,'#bf9766',bridge)
    for(const x of [1.9,5.15])for(const z of [-1.1,1.1])cylinder(x,.65,z,.08,.1,1,'#806c54',bridge)
    for(const z of [-1.1,1.1])box(3.5,.98,z,3.3,.065,.065,'#cbb88e',bridge)
    // Lighthouse, gallery, lantern and a slowly rotating beacon.
    cylinder(9,1.8,-4.1,.85,1.2,3.2,'#f1e7c8',scene,24)
    cylinder(9,2.3,-4.1,.93,1.02,.4,'#d28364',scene,24)
    cylinder(9,3.55,-4.1,1.23,1.2,.16,'#6f837d',scene,24)
    cylinder(9,4.1,-4.1,.7,.7,1.05,'#687e78',scene,12)
    const lantern=sphere(9,4.1,-4.1,.48,'#f4d788')
    const glow=new THREE.PointLight('#ffe4a2',0,16);glow.position.set(9,4.1,-4.1);scene.add(glow)
    cylinder(9,4.85,-4.1,0,1.05,.7,'#b96b54',scene,16)
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cylinder(9+Math.cos(a)*1.15,3.9,-4.1+Math.sin(a)*1.15,.025,.025,.6,'#8fa097')}
    const beamMaterial=new THREE.MeshBasicMaterial({color:'#ffe7ad',transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide})
    const beam=new THREE.Mesh(new THREE.ConeGeometry(1.2,9,24,1,true),beamMaterial);beam.rotation.z=Math.PI/2;beam.position.set(4.5,0,0)
    const beacon=new THREE.Group();beacon.position.set(9,4.1,-4.1);beacon.add(beam);scene.add(beacon)
    // DOM labels retain native text resolution at every camera zoom and display density.
    const labels:HTMLDivElement[]=[]
    const label=(text:string)=>{const el=document.createElement('div');el.className='npc-world-label';el.textContent=text;el.setAttribute('aria-hidden','true');host.appendChild(el);labels.push(el);return el}
    const character=(color:string,hatColor:string)=>{
      const group=new THREE.Group();scene.add(group)
      const left=box(-.16,.42,0,.22,.55,.25,'#273b3b',group),right=box(.16,.42,0,.22,.55,.25,'#273b3b',group)
      cylinder(0,.91,0,.25,.33,.64,color,group,12)
      sphere(0,1.45,0,.27,'#edb88a',group)
      for(const side of [-1,1]){box(side*.34,1.02,0,.16,.4,.2,color,group);sphere(side*.34,.77,.03,.09,'#edb88a',group)}
      cylinder(0,1.68,0,.28,.31,.2,hatColor,group,12)
      cylinder(0,1.58,0,.43,.43,.055,hatColor,group,16)
      box(0,1.05,-.29,.37,.44,.22,'#b99969',group)
      for(const x of [-.1,.1])sphere(x,1.47,.245,.025,'#3d4741',group)
      return {group,left,right}
    }
    const hero=character('#267fa3','#e8ae42');hero.group.position.set(SPAWN.x,.19,SPAWN.z)
    const heroRing=mesh(new THREE.RingGeometry(.38,.46,32),'#fff1c4');heroRing.rotation.x=-Math.PI/2;heroRing.position.y=.21
    const npcs=islandQuests.map((q,i)=>{
      const npc=character(['#b34f5f','#327557','#c17c28','#6b59a0'][i],['#cc9259','#677854','#b78547','#697aa6'][i])
      npc.group.position.set(q.x,.19,q.z);npc.group.rotation.y=.5
      const tag=label(q.npc)
      const marker=sphere(0,2,0,.13,'#ffe6a1',npc.group)
      return { ...npc,tag,marker }
    })
    const spark=new THREE.Group();scene.add(spark)
    box(0,.62,0,.4,.42,.34,'#e2a23d',spark)
    box(0,.9,0,.48,.3,.35,'#f5cf6e',spark)
    box(0,.92,.19,.35,.16,.03,'#173b42',spark)
    for(const x of [-.1,.1])sphere(x,.94,.22,.045,'#79efdc',spark)
    cylinder(0,1.15,0,.025,.025,.22,'#425d58',spark)
    sphere(0,1.28,0,.065,'#ffce4f',spark)
    for(const x of [-.27,.27])cylinder(x,.47,0,.11,.11,.14,'#334c49',spark,8).rotation.z=Math.PI/2
    const sparkLabel=label('Искра')
    spark.position.set(SPAWN.x+.8,.2,SPAWN.z+.7)
    let viewportWidth=1,viewportHeight=1
    const projected=new THREE.Vector3()
    const projectLabel=(el:HTMLDivElement,x:number,y:number,z:number,visible=true)=>{
      const point=projected.set(x,y,z).project(camera)
      el.hidden=!visible||Math.abs(point.x)>.96||Math.abs(point.y)>.94||point.z>1
      el.style.transform=`translate3d(${Math.round((point.x*.5+.5)*viewportWidth)}px,${Math.round((-point.y*.5+.5)*viewportHeight)}px,0) translate(-50%,-100%)`
    }
    const destinationRing=mesh(new THREE.RingGeometry(.2,.32,28),'#f8e6b7');destinationRing.rotation.x=-Math.PI/2;destinationRing.position.y=.23;destinationRing.visible=false
    const clouds:THREE.Group[]=[]
    for(let i=0;i<3;i++){
      const cloud=new THREE.Group();scene.add(cloud);cloud.position.set(-15+i*12,7,-13+i*3)
      for(let j=0;j<3;j++){const puff=sphere(j*.8,Math.sin(j)*.25,0,.85,'#e5ede4',cloud);puff.scale.set(1.5,.55,1);puff.castShadow=false}
      clouds.push(cloud)
    }
    let position:Position={...SPAWN},path:Position[]=[],nearby:number|null=null,lastCommand=-1,travelTo:number|null=null
    let frame=0,last=performance.now(),elapsed=0,lastReport=0,disposed=false,contextLost=false,bridgeAge=live.current.completed.includes(islandQuests[2].id)?3:0
    const keys=new Set<string>(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2()
    const ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.2),hit=new THREE.Vector3()
    const state=():WorldState=>({gate:live.current.completed.includes(islandQuests[1].id),bridge:live.current.completed.includes(islandQuests[2].id)})
    const reduced=matchMedia('(prefers-reduced-motion: reduce)')
    const go=(target:Position)=>{travelTo=null;path=findPath(position,target,state());destinationRing.visible=path.length>0;if(path.length)destinationRing.position.set(path.at(-1)!.x,.23,path.at(-1)!.z)}
    const keydown=(event:KeyboardEvent)=>{
      if(live.current.paused||!host.contains(document.activeElement))return
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','KeyE'].includes(event.code))event.preventDefault()
      if(event.code==='KeyE'&&!event.repeat&&nearby!==null)live.current.onInteract(nearby)
      else keys.add(event.code)
    }
    const keyup=(e:KeyboardEvent)=>keys.delete(e.code)
    const blur=()=>{keys.clear()}
    const click=(event:PointerEvent)=>{
      if(live.current.paused||event.button!==0)return
      host.focus({preventScroll:true})
      const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1)
      ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(ground,hit))go({x:hit.x,z:hit.z})
    }
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;viewportWidth=w;viewportHeight=h;renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2,Math.sqrt(4000000/(w*h))));renderer.setSize(w,h);const aspect=w/h;camera.left=-8*aspect;camera.right=8*aspect;camera.top=8;camera.bottom=-8;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(host)
    const offset=new THREE.Vector3(12,17,15),target=new THREE.Vector3(SPAWN.x,0,SPAWN.z)
    camera.position.copy(target).add(offset);camera.lookAt(target)
    const render=(now:number)=>{
      frame=0;if(disposed||contextLost||document.hidden)return
      const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt
      const p=live.current,worldState=state(),ambient=p.motion&&!reduced.matches
      if(p.destination&&p.destination.serial!==lastCommand){lastCommand=p.destination.serial;const q=islandQuests[p.destination.index];go({x:q.x,z:q.z+1.1});travelTo=p.destination.index}
      let dx=0,dz=0
      if(!p.paused) {
        const h=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+p.direction.x
        const v=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+p.direction.y
        if(h||v){path=[];travelTo=null;dx=(h-v)*Math.SQRT1_2;dz=(-h-v)*Math.SQRT1_2}
        else if(path.length){const point=path[0];dx=point.x-position.x;dz=point.z-position.z;if(Math.hypot(dx,dz)<.12){path.shift();dx=0;dz=0}}
        const length=Math.hypot(dx,dz)
        if(length){const distance=Math.min(4*dt,length);const before=position;position=movePlayer(position,dx/length*distance,dz/length*distance,worldState);if(before.x===position.x&&before.z===position.z)path=[];hero.group.rotation.y=Math.atan2(dx,dz)}
      } else {keys.clear();path=[];travelTo=null}
      destinationRing.visible=path.length>0
      hero.group.position.set(position.x,.19,position.z);heroRing.position.set(position.x,.21,position.z)
      const walking=Math.hypot(dx,dz)>.01&&!p.paused
      hero.left.rotation.x=walking?Math.sin(elapsed*12)*.4:0;hero.right.rotation.x=-hero.left.rotation.x
      if(ambient){waterMaterial.uniforms.time.value=elapsed;clouds.forEach((c,i)=>{c.position.x=-15+i*12+Math.sin(elapsed*.025+i)*2})}
      const gateTarget=worldState.gate?2.5:0
      gate.position.y=ambient?THREE.MathUtils.damp(gate.position.y,gateTarget,5,dt):gateTarget
      bridge.visible=worldState.bridge
      bridgeAge=worldState.bridge?bridgeAge+dt:0
      bridge.children.forEach((part,i)=>{if(i<6){const t=ambient?Math.min(1,Math.max(0,(bridgeAge-i*.16)*3)):1;part.visible=t>0;part.position.y=.31+(1-t)*1.8;part.scale.y=Math.max(.01,t)}else part.visible=!ambient||bridgeAge>1.1})
      const lit=p.completed.includes(islandQuests[3].id)
      glow.intensity=lit?18:0;beacon.visible=lit;lantern.scale.setScalar(lit?1.2:0.8)
      if(ambient)beacon.rotation.y=elapsed*.3
      const awakened=p.completed.includes(islandQuests[0].id)
      doorLights.forEach(w=>w.visible=awakened)
      spark.visible=awakened
      if(awakened){spark.position.lerp(new THREE.Vector3(position.x-1,.2,position.z+.1),1-Math.exp(-dt*3));spark.position.y=.2+(ambient?Math.sin(elapsed*4)*.06:0);spark.rotation.y=hero.group.rotation.y}
      nearby=null;let best=2.15
      npcs.forEach((n,i)=>{const q=islandQuests[i],d=Math.hypot(position.x-q.x,position.z-q.z);if(d<best){nearby=i;best=d}n.marker.visible=!p.completed.includes(q.id);if(ambient)n.marker.position.y=2+Math.sin(elapsed*2+i)*.08})
      if(now-lastReport>120){p.onPosition({...position},nearby);lastReport=now}
      if(travelTo!==null&&!p.paused&&!path.length){const q=islandQuests[travelTo];if(Math.hypot(position.x-q.x,position.z-q.z)<2.15){const index=travelTo;travelTo=null;p.onInteract(index)}else travelTo=null}
      const eventTargets=[[-7,0,0],[-3,0,0],[3.5,0,0],[9,1,-4.1]]
      const focus=p.event===null?null:eventTargets[p.event]
      const aim=focus?new THREE.Vector3(...focus):new THREE.Vector3(position.x,.4,position.z)
      if(focus&&host.clientWidth<560)aim.add(new THREE.Vector3(2,0,2.5))
      if(!ambient)target.copy(aim);else target.lerp(aim,1-Math.exp(-dt*5))
      camera.position.copy(target).add(offset);camera.lookAt(target)
      if(camera.zoom!==p.zoom){camera.zoom=p.zoom;camera.updateProjectionMatrix()}
      const next=islandQuests.findIndex(q=>!p.completed.includes(q.id))
      npcs.forEach((n,i)=>{const q=islandQuests[i],done=p.completed.includes(q.id);const text=`${done?'✓ ':i===next?'! ':''}${q.npc}`;if(n.tag.textContent!==text)n.tag.textContent=text;n.tag.dataset.current=String(i===next);projectLabel(n.tag,q.x,2.85,q.z)})
      projectLabel(sparkLabel,spark.position.x,1.7,spark.position.z,awakened)
      renderer.render(scene,camera);frame=requestAnimationFrame(render)
    }
    const visibility=()=>{keys.clear();if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();if(!document.hidden&&!contextLost)frame=requestAnimationFrame(render)}
    const lost=(e:Event)=>{e.preventDefault();contextLost=true;if(frame)cancelAnimationFrame(frame);setFailed(true);live.current.onUnavailable()}
    host.addEventListener('pointerdown',click);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur)
    document.addEventListener('visibilitychange',visibility);renderer.domElement.addEventListener('webglcontextlost',lost)
    resize();host.focus({preventScroll:true});frame=requestAnimationFrame(render)
    return ()=>{
      disposed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect()
      host.removeEventListener('pointerdown',click);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur)
      document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',lost)
      const geometries=new Set<THREE.BufferGeometry>(),allMaterials=new Set<THREE.Material>()
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>allMaterials.add(m))}else if(o instanceof THREE.Sprite)allMaterials.add(o.material)})
      geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());labels.forEach(el=>el.remove());renderer.dispose();renderer.domElement.remove()
    }
  },[])
  return <div ref={hostRef} tabIndex={0} className="island-canvas" role="application" aria-label="Остров. WASD или стрелки — идти, E — поговорить. Можно нажать на землю.">{failed&&<div className="island-no-webgl"><strong>3D сейчас недоступно</strong><p>Продолжай приключение через журнал заданий. Все упражнения Python работают.</p></div>}</div>
}
