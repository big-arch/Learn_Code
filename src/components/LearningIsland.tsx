import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Box, MousePointer2 } from 'lucide-react'
import { courses } from '../data/courses'

interface LearningIslandProps {
  paused: boolean
  completed: boolean
  onCrystalClick: () => void
}

export function LearningIsland({ paused, completed, onCrystalClick }: LearningIslandProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  const completedRef = useRef(completed)
  const callbackRef = useRef(onCrystalClick)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { completedRef.current = completed }, [completed])
  useEffect(() => { callbackRef.current = onCrystalClick }, [onCrystalClick])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      queueMicrotask(() => setWebglFailed(true))
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2('#0c1210', 0.026)
    const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100)
    camera.position.set(7.4, 6.3, 8.4)
    camera.lookAt(0, 0.15, 0)

    const world = new THREE.Group()
    world.rotation.y = -0.18
    scene.add(world)

    const standard = (color: string, roughness = 0.65, metalness = 0.15) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    const glow = (color: string, intensity = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.28, metalness: 0.35 })
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = world) => {
      const item = new THREE.Mesh(geometry, material)
      item.castShadow = true
      item.receiveShadow = true
      parent.add(item)
      return item
    }

    const underside = mesh(new THREE.ConeGeometry(2.12, 2.55, 6), standard('#111a17', 0.92))
    underside.rotation.z = Math.PI
    underside.position.y = -1.78
    const island = mesh(new THREE.CylinderGeometry(2.55, 1.96, 0.7, 6), standard('#25322b', 0.88))
    island.position.y = -0.43
    const rim = mesh(new THREE.CylinderGeometry(2.61, 2.61, 0.1, 6), standard('#3a4b3d', 0.58, 0.35))
    rim.position.y = -0.05
    const top = mesh(new THREE.CylinderGeometry(2.53, 2.53, 0.08, 6), standard('#17231e', 0.82))
    top.position.y = 0.035

    const grid = new THREE.GridHelper(4.3, 10, '#4b6353', '#2b3b32')
    grid.position.y = 0.085
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.34 })
    world.add(grid)

    const pathMaterial = new THREE.MeshBasicMaterial({ color: '#d7ff64', transparent: true, opacity: 0.5 })
    const path = mesh(new THREE.BoxGeometry(0.055, 0.015, 3.25), pathMaterial)
    path.position.set(0, 0.1, 0.15)
    path.rotation.y = -0.68

    const robot = new THREE.Group()
    robot.position.set(0.05, 0.16, 0.35)
    world.add(robot)
    const shell = standard('#c9d4c9', 0.38, 0.5)
    const dark = standard('#17201c', 0.45, 0.65)
    const body = mesh(new THREE.BoxGeometry(0.76, 0.68, 0.58), shell, robot)
    body.position.y = 0.77
    const chest = mesh(new THREE.BoxGeometry(0.46, 0.23, 0.035), glow('#d7ff64', 0.9), robot)
    chest.position.set(0, 0.79, 0.31)
    const head = mesh(new THREE.BoxGeometry(0.88, 0.52, 0.64), shell, robot)
    head.position.y = 1.42
    const visor = mesh(new THREE.BoxGeometry(0.68, 0.25, 0.04), dark, robot)
    visor.position.set(0, 1.43, 0.34)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#d7ff64' })
    for (const x of [-0.18, 0.18]) {
      const eye = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.025), eyeMaterial, robot)
      eye.position.set(x, 1.45, 0.37)
    }
    for (const x of [-0.24, 0.24]) {
      const leg = mesh(new THREE.BoxGeometry(0.19, 0.45, 0.22), dark, robot)
      leg.position.set(x, 0.23, 0)
      const foot = mesh(new THREE.BoxGeometry(0.28, 0.13, 0.39), shell, robot)
      foot.position.set(x, 0.03, 0.08)
    }
    for (const x of [-0.51, 0.51]) {
      const arm = mesh(new THREE.BoxGeometry(0.18, 0.58, 0.2), shell, robot)
      arm.position.set(x, 0.79, 0)
      arm.rotation.z = x > 0 ? -0.14 : 0.14
    }
    const antenna = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.33, 8), dark, robot)
    antenna.position.set(0.23, 1.86, 0)
    const antennaLight = mesh(new THREE.SphereGeometry(0.075, 12, 12), glow('#ff8a5b', 2.2), robot)
    antennaLight.position.set(0.23, 2.04, 0)

    const robotRing = mesh(new THREE.TorusGeometry(0.73, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: '#d7ff64', transparent: true, opacity: 0.65 }), robot)
    robotRing.rotation.x = Math.PI / 2
    robotRing.position.y = -0.075

    const core = mesh(new THREE.OctahedronGeometry(0.48, 0), glow('#6ce5e8', 2.4))
    core.position.set(-1.15, 1.0, -0.85)
    const coreBase = mesh(new THREE.CylinderGeometry(0.43, 0.58, 0.5, 6), dark)
    coreBase.position.set(-1.15, 0.28, -0.85)

    const crystals: THREE.Mesh[] = []
    courses.forEach((course, index) => {
      const angle = (index / courses.length) * Math.PI * 2 + 0.2
      const radius = index % 2 === 0 ? 2.02 : 1.84
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const base = mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.16, 6), standard('#34433a', 0.6, 0.4))
      base.position.set(x, 0.17, z)
      const crystal = mesh(new THREE.OctahedronGeometry(index % 2 === 0 ? 0.24 : 0.2, 0), glow(course.color, 1.8))
      crystal.position.set(x, 0.58, z)
      crystal.userData.language = course.id
      crystal.userData.baseY = crystal.position.y
      crystals.push(crystal)
    })

    for (const [x, z, height] of [[1.35, -1.05, 0.85], [1.58, 0.65, 0.48], [-0.55, 1.55, 0.58]] as const) {
      const pillar = mesh(new THREE.BoxGeometry(0.22, height, 0.22), standard('#526357', 0.7, 0.3))
      pillar.position.set(x, height / 2 + 0.09, z)
      const cap = mesh(new THREE.BoxGeometry(0.34, 0.06, 0.34), glow('#d7ff64', 0.45))
      cap.position.set(x, height + 0.1, z)
    }

    const orbitMaterial = new THREE.MeshBasicMaterial({ color: '#72877a', transparent: true, opacity: 0.22 })
    const orbitA = mesh(new THREE.TorusGeometry(3.02, 0.012, 6, 160), orbitMaterial)
    orbitA.rotation.set(Math.PI / 2.35, 0.25, 0.1)
    const orbitB = mesh(new THREE.TorusGeometry(2.8, 0.009, 6, 160), orbitMaterial.clone())
    orbitB.rotation.set(Math.PI / 1.85, -0.35, 0.5)

    const satellite = mesh(new THREE.SphereGeometry(0.09, 12, 12), glow('#ff8a5b', 2), orbitA)
    satellite.position.set(3.02, 0, 0)

    const successRing = mesh(new THREE.TorusGeometry(1.05, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: '#d7ff64', transparent: true, opacity: 0.7 }), robot)
    successRing.rotation.x = Math.PI / 2
    successRing.position.y = 0.85
    successRing.visible = false

    const particlePositions = new Float32Array(120 * 3)
    for (let index = 0; index < 120; index += 1) {
      const radius = 3.1 + Math.random() * 2.7
      const angle = Math.random() * Math.PI * 2
      particlePositions[index * 3] = Math.cos(angle) * radius
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 4.5
      particlePositions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#a8c7af', size: 0.025, transparent: true, opacity: 0.65 }))
    scene.add(particles)

    scene.add(new THREE.HemisphereLight('#dff9e7', '#14251d', 1.75))
    const keyLight = new THREE.DirectionalLight('#f0ffdc', 3.2)
    keyLight.position.set(4, 8, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)
    const cyanLight = new THREE.PointLight('#6ce5e8', 22, 10, 2)
    cyanLight.position.set(-3, 2, -2)
    scene.add(cyanLight)
    const warmLight = new THREE.PointLight('#ff8a5b', 16, 9, 2)
    warmLight.position.set(3, 0, 2)
    scene.add(warmLight)

    const pointer = new THREE.Vector2(2, 2)
    const pointerTarget = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    let frameId = 0
    let inView = true
    let contentVisible = true
    let pageVisible = !document.hidden
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motionQuery.matches
    const clock = { origin: performance.now(), start() { this.origin = performance.now() }, stop() {}, getElapsedTime() { return (performance.now() - this.origin) / 1000 } }

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      const aspect = width / height
      const frustum = width < 600 ? 7.8 : 6.9
      camera.left = -frustum * aspect / 2
      camera.right = frustum * aspect / 2
      camera.top = frustum / 2
      camera.bottom = -frustum / 2
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.render(scene, camera)
    }

    const updateRaycaster = () => {
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(crystals, false)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      pointerTarget.set(pointer.x, pointer.y)
      renderer.domElement.style.cursor = updateRaycaster().length > 0 ? 'pointer' : 'default'
    }
    const onPointerLeave = () => {
      pointerTarget.set(0, 0)
      pointer.set(2, 2)
      renderer.domElement.style.cursor = 'default'
    }
    const onPointerDown = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      if (updateRaycaster().length > 0) callbackRef.current()
    }

    const animate = () => {
      frameId = 0
      if (pausedRef.current || !inView || !contentVisible || !pageVisible || reducedMotion) return
      const time = clock.getElapsedTime()
      world.rotation.y += (pointerTarget.x * 0.1 - 0.18 - world.rotation.y) * 0.025
      world.rotation.x += (-pointerTarget.y * 0.035 - world.rotation.x) * 0.025
      robot.position.y = 0.16 + Math.sin(time * 1.8) * 0.055
      robot.rotation.y = Math.sin(time * 0.55) * 0.12
      core.rotation.y = time * 0.8
      core.position.y = 1 + Math.sin(time * 1.5) * 0.1
      crystals.forEach((crystal, index) => {
        crystal.rotation.y = time * (0.55 + index * 0.04)
        crystal.position.y = crystal.userData.baseY + Math.sin(time * 1.7 + index) * 0.07
      })
      orbitA.rotation.z = time * 0.08
      orbitB.rotation.z = -time * 0.055
      particles.rotation.y = time * 0.012
      successRing.visible = completedRef.current
      successRing.rotation.z = time * 0.8
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    const syncPlayback = () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = 0
      if (!pausedRef.current && inView && contentVisible && pageVisible && !reducedMotion) {
        clock.start()
        frameId = window.requestAnimationFrame(animate)
      } else {
        clock.stop()
        successRing.visible = completedRef.current
        renderer.render(scene, camera)
      }
    }

    const onVisibility = () => { pageVisible = !document.hidden; syncPlayback() }
    const onMotion = (event: MediaQueryListEvent) => { reducedMotion = event.matches; syncPlayback() }
    const onContentVisibility = (event: Event) => {
      contentVisible = !(event as Event & { skipped: boolean }).skipped
      syncPlayback()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    let intersectionObserver: IntersectionObserver | null = null
    if (!('contentVisibility' in document.documentElement.style)) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting
        syncPlayback()
      }, { rootMargin: '200px' })
      intersectionObserver.observe(host)
    } else {
      host.addEventListener('contentvisibilityautostatechange', onContentVisibility)
    }
    host.addEventListener('learning-island-sync', syncPlayback)
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerleave', onPointerLeave)
    host.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('visibilitychange', onVisibility)
    motionQuery.addEventListener('change', onMotion)

    resize()
    syncPlayback()

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      intersectionObserver?.disconnect()
      host.removeEventListener('contentvisibilityautostatechange', onContentVisibility)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      host.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('visibilitychange', onVisibility)
      motionQuery.removeEventListener('change', onMotion)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.dispatchEvent(new Event('learning-island-sync'))
  }, [paused, completed])

  return (
    <div className="learning-island">
      {webglFailed ? (
        <div className="island-fallback" role="img" aria-label="Схема острова знаний с шестью языками программирования">
          <Box size={72} strokeWidth={1} aria-hidden="true" />
          <div>{courses.map((course) => <span key={course.id} style={{ color: course.color }}>{course.name}</span>)}</div>
          <p>3D недоступно на этом устройстве.<br />Все учебные миссии продолжают работать.</p>
        </div>
      ) : (
        <div ref={hostRef} className="island-canvas" role="img" aria-label="Интерактивный 3D-остров: робот окружён шестью кристаллами языков программирования. Наведи указатель и нажми на кристалл." />
      )}
      {!webglFailed && <div className="island-interaction-hint"><MousePointer2 size={13} aria-hidden="true" /> НАВЕДИ · ИССЛЕДУЙ · НАЖМИ</div>}
      <div className="scene-coordinate coordinate-a">X: 48.12<br />Y: 07.64</div>
      <div className="scene-coordinate coordinate-b">LEARNING<br />SIMULATION</div>
    </div>
  )
}
