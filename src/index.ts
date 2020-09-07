import { Mesh } from 'three'
import * as THREE from 'three'
import { sphereRandom, positionAt, velocityAt, CurveManager } from './tube'
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
const ball = new Ball()
scene.add(ball.mesh)
const envObject = new Environment(...createTextures(renderer))
scene.add(envObject.mesh)

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

function animate() {
  const time = performance.now() / 1000
  const dt = time - twas
  twas = time
  if (running) {
    ball.update(time)
    curves.reset()
    for(let i = 0; i < 10; i++) if (Math.random() < 0.2) add()
    update(dt)
  }
  const th = 0 * time / 4 - Math.PI / 2
  camera.position.x = 0.5 * Math.cos(th)
  camera.position.y = 0.5 * Math.sin(th)
  camera.position.z = 0.1 * Math.sin(1.0 * time)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  curves.update(camera.position)
  renderer.setRenderTarget(target)
  envObject.set(0.5, 0.2)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
  requestAnimationFrame(animate)
}
animate()
