import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { islandQuests } from '../data/adventure'
import { buildings, trees, SPAWN, findPath, movePlayer } from './world'
import type { Position, WorldState } from './world'

interface Props {
  completed: string[]; paused: boolean; motion: boolean; zoom: number
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
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setClearColor('#9cccd2')
    renderer.domElement.setAttribute('aria-hidden','true')
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-12,12,8,-8,0.1,100)
    scene.add(new THREE.HemisphereLight('#e7f2e9','#768b5e',2.5))
    const sunlight = new THREE.DirectionalLight('#fff0cf',3.3)
    sunlight.position.set(-8,18,9);sunlight.castShadow=true
    sunlight.shadow.mapSize.set(1024,1024)
    Object.assign(sunlight.shadow.camera,{left:-18,right:18,top:15,bottom:-15,near:1,far:50})
    sunlight.shadow.bias=-0.0005
    scene.add(sunlight)
    const materials = new Map<string,THREE.MeshStandardMaterial>()
    const material = (color:string) => {
      if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:0.87}))
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
      fragmentShader:'uniform float time; varying vec2 pos; void main(){float a=sin(pos.x*2.+pos.y*1.4+time*.45);float b=sin(pos.x*.7-pos.y*2.1+time*.3);float light=smoothstep(1.45,1.95,a+b);vec3 base=mix(vec3(.22,.58,.64),vec3(.42,.72,.73),sin(pos.y*.2)*.5+.5);gl_FragColor=vec4(base+light*.09,1.);}'
    })
    const water=new THREE.Mesh(new THREE.PlaneGeometry(130,130),waterMaterial)
    water.rotation.x=-Math.PI/2;water.position.y=-0.65;scene.add(water)
    const island=cylinder(0,-0.55,0,13.2,12.5,1,'#cab18c',scene,64);island.scale.z=0.7
    const beach=cylinder(0,-0.02,0,13,13.2,0.18,'#ecd6a6',scene,64);beach.scale.z=0.7
    const grass=cylinder(-0.1,0.08,-0.1,12.35,12.65,0.18,'#a8bb77',scene,64);grass.scale.z=0.7
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
      // Four-sided roof, rotated into a gable-like silhouette.
      const roof=mesh(new THREE.ConeGeometry(2.05,1.3,4),b.roof);roof.position.set(b.x,2.65,b.z);roof.rotation.y=Math.PI/4;roof.scale.z=b.depth/b.width
      box(b.x,0.7,b.z+b.depth/2+.025,.64,1.12,.09,'#6c7060')
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
      const canopy=sphere(x,2,z,1.02,i%4===0?'#cdb1a1':i%3===0?'#799c68':'#8fab6c')
      canopy.scale.y=1.1
      sphere(x-.48,1.65,z+.2,.65,i%4===0?'#e5c7b3':'#9bb77c')
      sphere(x+.45,1.85,z-.1,.65,i%4===0?'#e0b8a8':'#a3ba79')
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
    const labelTextures:THREE.Texture[]=[]
    const label=(text:string,parent:THREE.Object3D,y:number,color='#fff4d2')=>{
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#263d39';ctx.beginPath();ctx.roundRect(8,8,496,92,30);ctx.fill()
      ctx.fillStyle=color;ctx.font='600 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,56)
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;labelTextures.push(texture)
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(2.3,.5,1);sprite.position.y=y;parent.add(sprite);return sprite
    }
    const character=(color:string,hatColor:string)=>{
      const group=new THREE.Group();scene.add(group)
      const left=box(-.16,.42,0,.22,.55,.25,'#5f6960',group),right=box(.16,.42,0,.22,.55,.25,'#5f6960',group)
      cylinder(0,.91,0,.25,.33,.64,color,group,12)
      sphere(0,1.45,0,.27,'#f0c8a3',group)
      cylinder(0,1.68,0,.28,.31,.2,hatColor,group,12)
      cylinder(0,1.58,0,.43,.43,.055,hatColor,group,16)
      box(0,1.05,-.29,.37,.44,.22,'#b99969',group)
      for(const x of [-.1,.1])sphere(x,1.47,.245,.025,'#3d4741',group)
      return {group,left,right}
    }
    const hero=character('#668d9e','#d7af70');hero.group.position.set(SPAWN.x,.19,SPAWN.z)
    const heroRing=mesh(new THREE.RingGeometry(.38,.46,32),'#fff1c4');heroRing.rotation.x=-Math.PI/2;heroRing.position.y=.21
    const npcs=islandQuests.map((q,i)=>{
      const npc=character(['#a87a77','#718e78','#bd9665','#8f91a6'][i],'#dfc28f')
      npc.group.position.set(q.x,.19,q.z);npc.group.rotation.y=.5
      const tag=label(q.npc,npc.group,2.45)
      const marker=sphere(0,2,0,.13,'#ffe6a1',npc.group)
      return { ...npc,tag,marker }
    })
    const destinationRing=mesh(new THREE.RingGeometry(.2,.32,28),'#f8e6b7');destinationRing.rotation.x=-Math.PI/2;destinationRing.position.y=.23;destinationRing.visible=false
    const clouds:THREE.Group[]=[]
    for(let i=0;i<3;i++){
      const cloud=new THREE.Group();scene.add(cloud);cloud.position.set(-15+i*12,7,-13+i*3)
      for(let j=0;j<3;j++){const puff=sphere(j*.8,Math.sin(j)*.25,0,.85,'#e5ede4',cloud);puff.scale.set(1.5,.55,1);puff.castShadow=false}
      clouds.push(cloud)
    }
    let position:Position={...SPAWN},path:Position[]=[],nearby:number|null=null,lastCommand=-1
    let frame=0,last=performance.now(),elapsed=0,lastReport=0,disposed=false,contextLost=false
    const keys=new Set<string>(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2()
    const ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.2),hit=new THREE.Vector3()
    const state=():WorldState=>({gate:live.current.completed.includes(islandQuests[1].id),bridge:live.current.completed.includes(islandQuests[2].id)})
    const reduced=matchMedia('(prefers-reduced-motion: reduce)')
    const go=(target:Position)=>{path=findPath(position,target,state());destinationRing.visible=path.length>0;if(path.length)destinationRing.position.set(path.at(-1)!.x,.23,path.at(-1)!.z)}
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
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h;camera.left=-8*aspect;camera.right=8*aspect;camera.top=8;camera.bottom=-8;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(host)
    const offset=new THREE.Vector3(12,17,15),target=new THREE.Vector3(SPAWN.x,0,SPAWN.z)
    camera.position.copy(target).add(offset);camera.lookAt(target)
    const render=(now:number)=>{
      frame=0;if(disposed||contextLost||document.hidden)return
      const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt
      const p=live.current,worldState=state(),ambient=p.motion&&!reduced.matches
      if(p.destination&&p.destination.serial!==lastCommand){lastCommand=p.destination.serial;const q=islandQuests[p.destination.index];go({x:q.x,z:q.z+1.1})}
      let dx=0,dz=0
      if(!p.paused) {
        const h=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+p.direction.x
        const v=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+p.direction.y
        if(h||v){path=[];dx=(h-v)*Math.SQRT1_2;dz=(-h-v)*Math.SQRT1_2}
        else if(path.length){const point=path[0];dx=point.x-position.x;dz=point.z-position.z;if(Math.hypot(dx,dz)<.12){path.shift();dx=0;dz=0}}
        const length=Math.hypot(dx,dz)
        if(length){const distance=Math.min(4*dt,length);const before=position;position=movePlayer(position,dx/length*distance,dz/length*distance,worldState);if(before.x===position.x&&before.z===position.z)path=[];hero.group.rotation.y=Math.atan2(dx,dz)}
      } else {keys.clear();path=[]}
      destinationRing.visible=path.length>0
      hero.group.position.set(position.x,.19,position.z);heroRing.position.set(position.x,.21,position.z)
      const walking=Math.hypot(dx,dz)>.01&&!p.paused
      hero.left.rotation.x=walking?Math.sin(elapsed*12)*.4:0;hero.right.rotation.x=-hero.left.rotation.x
      if(ambient){waterMaterial.uniforms.time.value=elapsed;clouds.forEach((c,i)=>{c.position.x=-15+i*12+Math.sin(elapsed*.025+i)*2})}
      const gateTarget=worldState.gate?2.5:0
      gate.position.y=ambient?THREE.MathUtils.damp(gate.position.y,gateTarget,5,dt):gateTarget
      bridge.visible=worldState.bridge
      const lit=p.completed.includes(islandQuests[3].id)
      glow.intensity=lit?18:0;beacon.visible=lit;lantern.scale.setScalar(lit?1.2:0.8)
      if(ambient)beacon.rotation.y=elapsed*.3
      doorLights.forEach(w=>w.visible=p.completed.includes(islandQuests[0].id))
      nearby=null;let best=2.15
      npcs.forEach((n,i)=>{const q=islandQuests[i],d=Math.hypot(position.x-q.x,position.z-q.z);if(d<best){nearby=i;best=d}n.marker.visible=!p.completed.includes(q.id);if(ambient)n.marker.position.y=2+Math.sin(elapsed*2+i)*.08})
      if(now-lastReport>120){p.onPosition({...position},nearby);lastReport=now}
      const aim=new THREE.Vector3(position.x,.4,position.z)
      if(reduced.matches)target.copy(aim);else target.lerp(aim,1-Math.exp(-dt*5))
      camera.position.copy(target).add(offset);camera.lookAt(target)
      if(camera.zoom!==p.zoom){camera.zoom=p.zoom;camera.updateProjectionMatrix()}
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
      geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());labelTextures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove()
    }
  },[])
  return <div ref={hostRef} tabIndex={0} className="island-canvas" role="application" aria-label="Остров. WASD или стрелки — идти, E — поговорить. Можно нажать на землю.">{failed&&<div className="island-no-webgl"><strong>3D сейчас недоступно</strong><p>Продолжай приключение через журнал заданий. Все упражнения Python работают.</p></div>}</div>
}
