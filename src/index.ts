import { Mesh } from 'three'
import * as THREE from 'three'
import { sphereRandom, positionAt, velocityAt, CurveManager, setWind } from './tube'
import { Ball } from './ball'
import { createTextures, Environment } from './texture'
const renderer = new THREE.WebGLRenderer()
const size = 1024
renderer.setSize(size, size)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
const curves = new CurveManager(scene)

camera.up = new THREE.Vector3(0, 0, 1)
document.body.appendChild(renderer.domElement)
const mouse = { x: 0, y: 0 }
document.body.onmousemove = e => {
  const el = renderer.domElement
  const width = el.offsetWidth
  const height = el.offsetHeight
  const size = Math.min(width, height)
  const ox = 2.0 * (e.pageX - el.offsetLeft - width / 2) / size
  const oy = 2.0 * (e.pageY - el.offsetTop - height / 2) / size
  const x = Math.max(-1, Math.min(ox, 1))
  const y = Math.max(-1, Math.min(oy, 1))
  const r = Math.hypot(x, y)
  const rscale = r < 1 ? r : (1 + (1 - Math.exp(2 * (1 - r))) / 2)
  mouse.x = x * rscale / r
  mouse.y = y * rscale / r
}
const envObject = new Environment(...createTextures(renderer))
scene.add(envObject.mesh)
const ball = new Ball()
scene.add(ball.mesh)
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

type P3 = { x: number; y: number; z: number }

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
  curve.color.setRGB(0.8, 0.4, 0.2)
  curve.brightness0 = 1
  curve.brightness1 = 0
  curve.brightness2 = 0
  curve.friction = friction
  curve.time = t
}

let sparks: SparkElement[] = []
let twas = performance.now() / 1000

function add() {
  const v = sphereRandom()
  const vr = 4
  const r = 0.01
  sparks.push({ p: { x: r * v.x, y: r * v.y, z: r * v.z }, v: { x: vr * v.x, y: vr * v.y, z: vr * v.z }, life: 0.1, at: 0.02 + 0.04 * Math.random(), w: 1 })
}
function update(dt: number) {
  const sparks2: SparkElement[] = []
  sparks.forEach(sp => nextSpark(sp, dt, sparks2))
  sparks = sparks2
}
for (let i = 0; i < 20; i++) add()
update(1000)
let running = false
document.body.onclick = () => { running = true }

envObject.set(0.3, 0.02)
function animate() {
  const time = performance.now() / 1000
  const dt = time - twas
  twas = time
  if (running) {
    envObject.set(0.3, 0.02 + 0.005 * (Math.sin(29.7 * time) + Math.sin(17.3 * time) + Math.sin(19.3 * time)))
    const wind = Math.sin(0.51 * time) + Math.sin(0.73 * time) + Math.sin(0.37 * time) + Math.sin(0.79 * time)
    setWind({ x: 0.1 * wind * wind })
    ball.update(time)
    curves.reset()
    for(let i = 0; i < 10; i++) if (Math.random() < 0.2) add()
    update(dt)
  }
  const thscale = 0.8
  const zth = mouse.y * thscale
  const xyth = -mouse.x * thscale - Math.PI / 2
  camera.position.x = 0.5 * Math.cos(xyth) * Math.cos(zth)
  camera.position.y = 0.5 * Math.sin(xyth) * Math.cos(zth)
  camera.position.z = 0.5 * Math.sin(zth)
  camera.lookAt(new THREE.Vector3(-mouse.x / 10, 0, mouse.y / 10))
  curves.update(camera.position)
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
  requestAnimationFrame(animate)
}
animate()
