import { Mesh } from 'three'
import * as THREE from 'three'
import { tubeMesh } from './tube'
const renderer = new THREE.WebGLRenderer()
const size = 800
renderer.setSize(size, size)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
scene.add(tubeMesh)
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
targetRenderScene.add(targetRenderMesh)

function animate() {
  const time = new Date().getTime() / 1000
  const th = time / 4
  camera.position.x = 3 * Math.cos(th)
  camera.position.y = 3 * Math.sin(th)
  camera.position.z = 0
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  renderer.render(targetRenderScene, targetRenderCamera)
  requestAnimationFrame(animate)
}
animate()
