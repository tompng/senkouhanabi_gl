import { Mesh, TrianglesDrawMode } from 'three'
import * as THREE from 'three'
import { P3, sphereRandom, positionAt, velocityAt, CurveManager, setWind } from './tube'
import { createTextures, Environment } from './texture'
import { Stick } from './stick'
const renderer = new THREE.WebGLRenderer()
const size = 1024
renderer.setSize(size, size)
const scene = new THREE.Scene()
const backgroundScene = new THREE.Scene()
const ballStickScene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
const curves = new CurveManager(scene)

camera.up = new THREE.Vector3(0, 0, 1)
document.body.appendChild(renderer.domElement)
const mouse = { x: 0, y: 0, down: false }
function touchPosition(e: { pageX: number; pageY: number }) {
  const el = renderer.domElement
  const width = el.offsetWidth
  const height = el.offsetHeight
  const size = Math.min(width, height)
  const x = 2.0 * (e.pageX - el.offsetLeft - width / 2) / size
  const y = 2.0 * (e.pageY - el.offsetTop - height / 2) / size
  return { x, y }
}
function setMouse(x: number, y: number) {
  const r = Math.hypot(x, y)
  const maxR = 4 / 3
  const rscale = r < maxR ? 1 : maxR / r
  mouse.x = x * rscale
  mouse.y = y * rscale
}
document.body.onpointerdown = e => {
  e.preventDefault()
  let prev = touchPosition(e)
  const id = e.pointerId
  const move = (e: PointerEvent) => {
    e.preventDefault()
    if (e.pointerId !== id) return
    const current = touchPosition(e)
    const dx = current.x - prev.x
    const dy = current.y - prev.y
    setMouse(mouse.x + dx, mouse.y + dy)
    prev = current
  }
  function up(e: PointerEvent) {
    if (e.pointerId !== id) return
    document.body.removeEventListener('pointermove', move)
    document.body.removeEventListener('pointerup', up)  
  }
  document.body.addEventListener('pointermove', move)
  document.body.addEventListener('pointerup', up)
}
document.body.onmousemove = e => {
  const o = touchPosition(e)
  const x = Math.max(-1, Math.min(o.x, 1))
  const y = Math.max(-1, Math.min(o.y, 1))
  setMouse(x, y)
}
const envObject = new Environment(...createTextures(renderer))
backgroundScene.add(envObject.mesh)
const stick = new Stick()
ballStickScene.add(stick.mesh)
stick.mesh.renderOrder = 1
const target = new THREE.WebGLRenderTarget(size, size, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.HalfFloatType
})
const targetRenderMesh = new Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial({ map: target.texture }))
const targetRenderScene = new THREE.Scene()
const targetRenderCamera = new THREE.Camera()
targetRenderMesh.scale.x = targetRenderMesh.scale.y = 2
targetRenderScene.add(targetRenderMesh)

type SparkElement = {
  p: P3
  v: P3
  life: number
  at: number
  w: number
}

const friction = 30
function nextSpark({ p, v, life, at, w }: SparkElement, time: number, out: SparkElement[]) {
  const t = Math.min(time, at)
  const fr = friction / w
  const p2 = positionAt(p, v, fr, t)
  const v2 = velocityAt(v, fr, t)
  sparkCurve(p, v, p2, v2, life, w, t, fr)
  if (t === life) return
  if (t === time) {
    out.push({ p: p2, v: v2, life: life - t, at: at - t, w })
    return
  }
  if (w < 1/16) return
  for (let i = 0; i < 10; i++) {
    const v3 = sphereRandom()
    const vr = 4
    const life2 = life - t
    const at2 = Math.min(life2, 0.02 + 2 * life2 * Math.random())
    nextSpark({
      p: p2,
      v: { x: v2.x + vr * v3.x, y: v2.y + vr * v3.y, z: v2.z + vr * v3.z },
      life: life2,
      at: at2,
      w: w / 2
    }, time - t, out)
  }
}

function sparkCurve(p: P3, v: P3, p2: P3, v2: P3, life: number, w: number, t: number, friction: number) {
  const curve = curves.get()
  curve.p.x = p.x
  curve.p.y = p.y
  curve.p.z = p.z
  curve.v.x = v.x
  curve.v.y = v.y
  curve.v.z = v.z
  const c = w * t * 4
  curve.color.setRGB(0.6, 0.3, 0.15)
  curve.brightness0 = 1
  curve.brightness1 = 0
  curve.brightness2 = 0
  curve.friction = friction
  curve.time = t
}

let sparks: SparkElement[] = []
let twas = performance.now() / 1000

function add(c: { x: number; y: number; z: number }) {
  const v = sphereRandom()
  const vr = 4
  const r = 0.01
  sparks.push({ p: { x: c.x + r * v.x, y: c.y + r * v.y, z: c.z + r * v.z }, v: { x: vr * v.x, y: vr * v.y, z: vr * v.z }, life: 0.1, at: 0.02 + 0.04 * Math.random(), w: 1 })
}
function update(dt: number) {
  const sparks2: SparkElement[] = []
  sparks.forEach(sp => nextSpark(sp, dt, sparks2))
  sparks = sparks2
}
for (let i = 0; i < 20; i++) add({ x: 0, y: 0, z: 0 })
update(1000)
let running = false
let time0: number | null = null
document.body.onclick = () => { running = true }
const windEffect = { x: 0, vx: 0 }
envObject.set(0.3, 0.02)
const focusPosition = { x: 0, y: 0, z: 0 }
function animate() {
  const time = performance.now() / 1000
  const dt = time - twas
  twas = time
  if (running) {
    envObject.set(0.3, 0.02 + 0.005 * (Math.sin(29.7 * time) + Math.sin(17.3 * time) + Math.sin(19.3 * time)))
    const wind = 0.1 * (Math.sin(0.51 * time) + Math.sin(0.73 * time) + Math.sin(0.37 * time) + Math.sin(0.79 * time)) ** 2
    setWind({ x: wind })
    windEffect.x += windEffect.vx * 0.1
    windEffect.vx += (wind * Math.random() - 0.5 * windEffect.x - 0.5 * windEffect.vx) * 0.2
    const we = windEffect.x
    const wm = { x: 0.04 * we, y: 0, z: 0.04 * we * we / 2 - 0.04 * we / 2 }
    focusPosition.x = wm.x
    focusPosition.y = wm.y
    focusPosition.z = wm.z
    stick.windMove.x = wm.x
    stick.windMove.z = wm.z
    if (time0 == null) time0 = time
    const phase = 1 - Math.exp(-0.6 * (time - time0))
    stick.setPhase(phase, time)
    curves.reset()
    for(let i = 0; i < 10; i++) if (Math.random() < (phase - 0.6) / 2) add(wm)
    update(dt)
    if (time0 == null) time0 = TrianglesDrawMode
  }
  const thscale = 0.8
  const zth = mouse.y * thscale
  const xyth = -mouse.x * thscale - Math.PI / 2
  camera.position.x = 0.4 * Math.cos(xyth) * Math.cos(zth)
  camera.position.y = 0.4 * Math.sin(xyth) * Math.cos(zth)
  camera.position.z = 0.4 * Math.sin(zth)
  camera.lookAt(new THREE.Vector3(-mouse.x / 10, 0, mouse.y / 10))
  renderer.setRenderTarget(target)
  renderer.autoClear = false
  renderer.clearColor()
  renderer.clearDepth()
  renderer.render(backgroundScene, camera)
  curves.update(camera.position, focusPosition)
  curves.setBackVisible()
  renderer.render(scene, camera)
  renderer.render(ballStickScene, camera)
  curves.setFrontVisible()
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
  renderer.autoClear = true
  requestAnimationFrame(animate)
}
animate()
