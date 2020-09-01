import { Mesh } from 'three'
import * as THREE from 'three'
import { sphereRandom, CurveManager } from './tube'
const renderer = new THREE.WebGLRenderer()
const size = 800
renderer.setSize(size, size)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
const curves = new CurveManager(scene)

for (let i = 0; i < 20; i++) {
  spark({ x: 0, y: 0, z: 0 }, sphereRandom(), 0)
}
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

function spark(p: P3, v: P3, step: number) {
  const life = 0.2 + Math.random()
  const curve = curves.get()
  const t = life
  const g = 0.4
  const p2 = { x: p.x + v.x * t, y: p.y + v.y * t, z: p.z + v.z * t - g * t * t / 2 }
  const v2 = { ...v, z: v.z - g * t }
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
  const c = 1 / (1 + step) * t / 2
  curve.cola.setRGB(0.8 * c / 40, 0.4 * c / 40, 0.2 * c / 40)
  curve.colb.setRGB(0.8 * c, 0.4 * c, 0.2 * c)
  const r = 1 / (1 + step)
  if (step == 2) return
  for (let i = 0; i < 8; i++) {
    const v3 = sphereRandom()
    spark(p2, { x: v2.x / 2 + r * v3.x, y: v2.y / 2 + r * v3.y, z: v2.z / 2 + r * v3.z }, step + 1)
  }
}


function animate() {
  const time = performance.now() / 1000
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
}
animate()
