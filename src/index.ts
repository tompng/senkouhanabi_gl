import { Mesh } from 'three'
import * as THREE from 'three'
import { sphereRandom, CurveManager } from './tube'
const renderer = new THREE.WebGLRenderer()
const size = 800
renderer.setSize(size, size)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
const curves = new CurveManager(scene)

// for (let i = 0; i < 20; i++) {
//   spark({ x: 0, y: 0, z: 0 }, sphereRandom(), 0)
// }
camera.up = new THREE.Vector3(0, 0, 1)
document.body.appendChild(renderer.domElement)

scene.add(new THREE.DirectionalLight('#bbb', 1))
scene.add(new THREE.AmbientLight('#444', 1))

const target = new THREE.WebGLRenderTarget(size, size, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.FloatType
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
const gravity = 20.4
function nextSpark({ p, v, life, at, w }: SparkElement, time: number, out: SparkElement[]) {
  const t = Math.min(time, at)
  const p2 = { x: p.x + v.x * t, y: p.y + v.y * t, z: p.z + v.z * t - gravity * t * t / 2 }
  const v2 = { ...v, z: v.z - gravity * t }
  sparkCurve(p, v, p2, v2, life, w, t)
  if (t === life) return
  if (t === time) {
    sparkCurve(p, v, p2, v2, life, w, t)
    out.push({ p: p2, v: v2, life: life - t, at: at - t, w })
    return
  }
  if (w < 1/16) return
  for (let i = 0; i < 10; i++) {
    const v3 = sphereRandom()
    const vr = 10 * w
    const life2 = life - t
    const at2 = Math.min(life2, 0.02 + 2 * life2 * Math.random())
    nextSpark({
      p: p2,
      v: { x: v2.x / 2 + vr * v3.x, y: v2.y / 2 + vr * v3.y, z: v2.z / 2 + vr * v3.z },
      life: life2,
      at: at2,
      w: w / 2
    }, time - t, out)
  }
}

function sparkCurve(p: P3, v: P3, p2: P3, v2: P3, life: number, w: number, t: number) {
  const curve = curves.get()
  curve.pa.x = p.x
  curve.pa.y = p.y
  curve.pa.z = p.z
  curve.pb.x = p2.x
  curve.pb.y = p2.y
  curve.pb.z = p2.z
  curve.da.x = v.x * t
  curve.da.y = v.y * t
  curve.da.z = v.z * t
  curve.db.x = v2.x * t
  curve.db.y = v2.y * t
  curve.db.z = v2.z * t
  const c = w * t * 4
  curve.cola.setRGB(0.8 * c, 0.4 * c, 0.2 * c)
  curve.colb.setRGB(0.8 * c, 0.4 * c, 0.2 * c)
}

let sparks: SparkElement[] = []
let twas = performance.now() / 1000

curves.reset()
const v = sphereRandom()
const vr = 4
sparks.push({ p: { x: 0, y: 0, z: 0 }, v: { x: vr * v.x, y: vr * v.y, z: vr * v.z }, life: 0.2, at: 0.2 * Math.random(), w: 1 })
sparks.forEach(sp => nextSpark(sp, 1000, []))

function animate() {
  const time = performance.now() / 1000
  const dt = (time - twas) * 2
  twas = time
  curves.reset()
  if (Math.random() < 0.2) {
    const v = sphereRandom()
    const vr = 4
    sparks.push({ p: { x: 0, y: 0, z: 0 }, v: { x: vr * v.x, y: vr * v.y, z: vr * v.z }, life: 0.2, at: 0.2 * Math.random(), w: 1 })
  }
  const sparks2: SparkElement[] = []
  sparks.forEach(sp => nextSpark(sp, dt, sparks2))
  sparks = sparks2
  const th = time / 4 - Math.PI / 2
  camera.position.x = 3 * Math.cos(th)
  camera.position.y = 3 * Math.sin(th)
  camera.position.z = 0
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  curves.update(camera.position)
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
  requestAnimationFrame(animate)
  // setTimeout(animate, 100)
}
animate()
