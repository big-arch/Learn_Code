import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Point } from '../types'

interface Props { position: Point; goal: Point; path: Point[]; color: string }
export function RobotWorld({ position, goal, path, color }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const update = useRef<((props: Props) => void) | null>(null)
  const [fallback, setFallback] = useState(false)
  const goalX = goal.x, goalY = goal.y
  useEffect(() => {
    if (!host.current) return
    const container = host.current
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) }
    catch { queueMicrotask(() => setFallback(true)); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-3, 3, 2.8, -2.8, 0.1, 50)
    camera.position.set(1.1, 6, 5)
    camera.lookAt(0, 0, 0)
    scene.add(new THREE.HemisphereLight('#e8ffed', '#183843', 3))
    const light = new THREE.DirectionalLight('#ffffff', 4)
    light.position.set(-3, 5, 2); scene.add(light)
    const make = (geometry: THREE.BufferGeometry, shade: string, parent: THREE.Object3D = scene, glow = false) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: shade, roughness: 0.45, metalness: 0.2, ...(glow ? { emissive: shade, emissiveIntensity: 0.5 } : {}) }))
      parent.add(mesh); return mesh
    }
    const base = make(new THREE.BoxGeometry(4.15, 0.35, 4.15), '#172a27'); base.position.y = -0.35
    const tiles = Array.from({ length: 9 }, (_, i) => {
      const tile = make(new THREE.BoxGeometry(1.12, 0.16, 1.12), '#304b43')
      tile.position.set((i % 3 - 1) * 1.25, -0.08, (Math.floor(i / 3) - 1) * 1.25)
      return tile
    })
    const robot = new THREE.Group(); scene.add(robot)
    const body = make(new THREE.BoxGeometry(0.48, 0.45, 0.38), '#e3eee8', robot); body.position.y = 0.35
    const head = make(new THREE.BoxGeometry(0.58, 0.38, 0.48), '#eef8ef', robot); head.position.y = 0.82
    const face = make(new THREE.BoxGeometry(0.43, 0.18, 0.03), '#12352f', robot); face.position.set(0, 0.83, 0.25)
    for (const x of [-0.12, 0.12]) {
      const eye = make(new THREE.BoxGeometry(0.07, 0.06, 0.035), '#bfff85', robot, true); eye.position.set(x, 0.85, 0.28)
      const foot = make(new THREE.BoxGeometry(0.16, 0.15, 0.3), '#83988a', robot); foot.position.set(x, 0.08, 0)
    }
    const gem = make(new THREE.OctahedronGeometry(0.32), color, scene, true)
    gem.position.set((goalX - 1) * 1.25, 0.65, (goalY - 1) * 1.25)
    gem.rotation.z = 0.2
    const render = () => renderer.render(scene, camera)
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight
      if (!width || !height) return
      camera.left = -2.65 * width / height; camera.right = 2.65 * width / height
      camera.updateProjectionMatrix(); renderer.setSize(width, height); render()
    }
    update.current = (props) => {
      robot.position.set((props.position.x - 1) * 1.25, 0, (props.position.y - 1) * 1.25)
      tiles.forEach((tile, i) => {
        const visited = props.path.some(p => p.x === i % 3 && p.y === Math.floor(i / 3))
        tile.material.color.set(visited ? '#527a54' : '#304b43')
        tile.material.emissive.set(visited ? '#142b16' : '#000000')
      })
      render()
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    const lost = (event: Event) => { event.preventDefault(); setFallback(true) }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      update.current = null; observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()) } })
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [color, goalX, goalY])
  useEffect(() => { update.current?.({ position, goal, path, color }) }, [position, goal, path, color])
  return <div className="robot-world" role="img" aria-label={'Робот: столбец ' + (position.x + 1) + ', строка ' + (position.y + 1) + '. Цель: столбец ' + (goal.x + 1) + ', строка ' + (goal.y + 1)}>
    <div ref={host} className="robot-canvas" hidden={fallback} />
    {fallback && <div className="fallback-board">{Array.from({ length: 9 }, (_, i) => <div key={i}>{position.x === i % 3 && position.y === Math.floor(i / 3) ? '🤖' : goal.x === i % 3 && goal.y === Math.floor(i / 3) ? '💎' : '·'}</div>)}<small>Режим 2D · обучение доступно без WebGL</small></div>}
  </div>
}
