import * as THREE from 'three'

const renderer = new THREE.WebGLRenderer()
renderer.setSize(800, 800)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 1, 100)
document.body.appendChild(renderer.domElement)
function animate() {
  let time = new Date().getTime() / 1000
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()
