import { Mesh } from 'three'
import * as THREE from 'three'
import { P3, sphereRandom, positionAt, velocityAt, CurveManager, setWind } from './tube'
import { createTextures, Environment } from './texture'
import { Stick, stickRadius } from './stick'
import { Fire } from './fire'
import { isWireFrame } from './setting'

const renderer = new THREE.WebGLRenderer()
const size = isWireFrame ? 1600 : 1024
renderer.setSize(size, size)
const scene = new THREE.Scene()
const backgroundScene = new THREE.Scene()
const ballStickScene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(isWireFrame ? 45 : 75, 1, 0.1, 100)
const curves = new CurveManager(scene)
camera.up = new THREE.Vector3(0, 0, 1)
document.body.appendChild(renderer.domElement)
const mouse = { x: 0, y: 0, down: false }
function smoothStep(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t)
}
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
  terminate: boolean
  at: number
  w: number
  color: number
  dcolor: number
}

const friction = 30
let terminateThreshold = 0.02
function nextSpark({ p, v, terminate, at, w, color, dcolor }: SparkElement, time: number, out: SparkElement[]) {
  const t = Math.min(time, at)
  const fr = friction / Math.pow(w, 1 / 3)
  const p2 = positionAt(p, v, fr, t)
  const v2 = velocityAt(v, fr, t)
  sparkCurve(p, v, w, t, fr, color, dcolor)
  if (t === at && terminate) return
  if (t !== at) {
    out.push({ p: p2, v: v2, terminate, at: at - t, w, color: color + dcolor * t, dcolor })
    return
  }
  const rands: P3[] = []
  const weights: number[] = []
  const numRands = 2 + 18 * Math.random()
  for (let i = 0; i < numRands; i++) {
    rands.push(sphereRandom())
    weights.push(Math.pow(Math.random(), 4))
  }
  const wsum = weights.reduce((a, b) => a + b)
  const avRand = { x: 0, y: 0, z: 0, w: 0 }
  rands.forEach(({ x, y, z }, i) => {
    const s = weights[i] / wsum
    avRand.x += x * s
    avRand.y += y * s
    avRand.z += z * s
  })
  rands.forEach(p => {
    p.x -= avRand.x
    p.y -= avRand.y
    p.z -= avRand.z
  })
  rands.forEach((v3, i) => {
    const w2 = weights[i] * w / wsum
    const vr = 4
    const terminate = w2 < terminateThreshold
    let at2 = 0.04 * Math.pow(w, 1 / 3) * Math.random()
    if (terminate) {
      at2 = at2 * 2
    } else {
      at2 + 1
    }
    nextSpark({
      p: p2,
      v: { x: v2.x + vr * v3.x, y: v2.y + vr * v3.y, z: v2.z + vr * v3.z },
      terminate,
      color: 1,
      dcolor: terminate ? -1 / at2 : 0,
      at: at2,
      w: w2
    }, time - t, out)
  })
}
let globalSparkBrightness = 1 / 4
function sparkCurve(p: P3, v: P3, w: number, t: number, friction: number, color: number, dcolor: number) {
  const curve = curves.get()
  curve.p.x = p.x
  curve.p.y = p.y
  curve.p.z = p.z
  curve.v.x = v.x
  curve.v.y = v.y
  curve.v.z = v.z
  curve.color.setRGB(0.6 * globalSparkBrightness, 0.3 * globalSparkBrightness, 0.15 * globalSparkBrightness)
  curve.brightness0 = color
  curve.brightness1 = dcolor
  curve.brightness2 = 0
  curve.friction = friction
  curve.time = t
}

let sparks: SparkElement[] = []
let twas = performance.now() / 1000

const fireItems = [...new Array(8)].map((_, i) => {
  const z = Math.random()
  const endTime = 2 + 5 * (1 - z) * (0.5 + 0.5 * Math.random())
  const startTime = Math.max(1, endTime - 1 - 0.5 * Math.random())
  const fire = new Fire()
  const size = 0.02 + 0.01 * Math.random()
  const th = 2 * Math.PI * Math.random()
  const tz = Math.PI * (Math.random() - 0.5) / 2
  fire.direction.x = size * Math.cos(th) * Math.cos(tz)
  fire.direction.y = size * Math.sin(th) * Math.cos(tz)
  fire.direction.z = size * Math.sin(tz)
  return {
    startTime,
    endTime,
    z,
    size,
    brightness: 0.1,
    fire
  }
})
for (let i = 0; i < 8; i++) {
  const fire = new Fire()
  const size = 0.04 + 0.02 * Math.random()
  const th = 2 * Math.PI * Math.random()
  const r = 0.2 * Math.random()
  fire.direction.x = size * r * Math.cos(th)
  fire.direction.y = size * r * Math.sin(th)
  fire.direction.z = size
  fireItems.push({
    startTime: 0.5 * Math.random(),
    endTime: 1 + Math.random() + 2 * i / 8 ,
    z: 1.2 - 0.1 * i / 8,
    size,
    brightness: 0.2 + 0.2 * Math.random(),
    fire
  })
}

function add(c: { x: number; y: number; z: number }, bsratio: number) {
  const dir = sphereRandom()
  const vr = 4
  const r = stickRadius * bsratio
  const p = { x: c.x + r * dir.x, y: c.y + r * dir.y, z: c.z + r * dir.z }
  const v = { x: vr * dir.x, y: vr * dir.y, z: vr * dir.z }
  const t = 0.02 + 0.1 * Math.random()
  const terminate = 0.3 + 0.5 * Math.random() < terminateThreshold
  const at = terminate ? 2 * t : t
  sparks.push({ p, v, terminate, at, w: 1, color: 1, dcolor: terminate ? -1 / at : 0 })
}
function update(dt: number) {
  const sparks2: SparkElement[] = []
  sparks.forEach(sp => nextSpark(sp, dt, sparks2))
  sparks = sparks2
}
for (let i = 0; i < 5; i++) add({ x: 0, y: 0, z: 0 }, 2.4)
update(1000)
let running = false
let started = false
document.body.onclick = () => {
  if (!running) {
    running = true
  } else if (!started) {
    started = true
    startTime = runningTime
  } else if (runningTime - startTime > 114) {
    startTime = runningTime
  }
}
const windEffect = { x: 0, y: 0, vx: 0, vy: 0 }
const focusPosition = { x: 0, y: 0, z: 0 }
let floorLighting = 0
let prevAddTime: number = 0
let runningTime = 0
let startTime = 0
const prevRenderedMousePos = { x: NaN, y: NaN }
document.body.onClick = () => {
  running = !running
}
function animate() {
  if (!running && prevRenderedMousePos.x === mouse.x && prevRenderedMousePos.y === mouse.y) {
    requestAnimationFrame(animate)
    return
  }
  const time = performance.now() / 1000
  const dt = Math.min(time - twas, 1 / 15)
  twas = time
  let fireLighting = 0
  if (running) {
    if (runningTime - startTime > 114 + 30) {
      started = true
      startTime = runningTime
    }
    globalSparkBrightness = 1
    const wind = 0.1 * (Math.sin(0.51 * time) + Math.sin(0.73 * time) + Math.sin(0.37 * time) + Math.sin(0.79 * time)) ** 2
    const wy = 0.1 * (Math.sin(1.43 * time) + Math.sin(1.97 * time) + Math.sin(1.19 * time))
    const wz = 0.1 * (Math.sin(1.71 * time) + Math.sin(1.37 * time) + Math.sin(1.13 * time))
    const wrand = (2 + Math.sin(23.84 * time) + Math.sin(17.57 * time)) / 4
    setWind({ x: wind, y: wy * wind, z: wz * wind })
    windEffect.x += windEffect.vx * dt
    windEffect.y += windEffect.vy * dt
    windEffect.vx += (48 * wind * wrand - 16 * windEffect.x - 2 * windEffect.vx) * dt
    windEffect.vy += (48 * wind * wrand - 16 * windEffect.y - 2 * windEffect.vy) * dt
    const wm = { x: 0.04 * windEffect.x, y: 0.04 * windEffect.y, z: 0.04 * (windEffect.x ** 2 + windEffect.y ** 2) / 8 }
    stick.windMove.x = wm.x
    stick.windMove.y = wm.y
    stick.windMove.z = wm.z
    const t = started ? runningTime - startTime : 0
    const phase = t < 1 ? 0 : 1 - Math.exp(-0.4 * (t - 1))
    const ballZ = 0.005 * 20 * (1 - Math.exp((1 - Math.sqrt(1 + t * t)) / 20))
    const ballStickRatio = Math.min(1.0 + 0.05 * t ** 2, 1.2 + (3 * t / 16 + 1 / 4) * Math.exp(-t / 16))
    if (t < 113) {
      stick.setPhase(phase, time, ballZ, ballStickRatio)
      stick.basePosition.z = 2 * smoothStep((t - 112))
    } else {
      stick.setPhase(0, time, 0, 1)
      stick.basePosition.z = 2 * smoothStep((114 - t))
    }
    terminateThreshold = 0.02 + 0.5 * smoothStep((t - 15) / 30)
    curves.reset()
    fireItems.forEach(item => {
      if (t > item.endTime) {
        ballStickScene.remove(item.fire.mesh)
        return
      }
      if (t < item.startTime) return
      ballStickScene.add(item.fire.mesh)
      const c = stick.ballCenter(-0.03 * item.z)
      item.fire.time = time
      const s = (t - item.startTime) / (item.endTime - item.startTime)
      item.fire.brightness = 16 * item.brightness * s * s * (1 - s) * (1 - s)
      fireLighting += item.fire.brightness * item.size
      item.fire.center.x = c.x
      item.fire.center.y = c.y
      item.fire.center.z = c.z
    })
    const center = stick.ballCenter()
    focusPosition.x = center.x
    focusPosition.y = center.y
    focusPosition.z = center.z
    const rnd = Math.min(smoothStep((t - 4) / 30), smoothStep((50 - t) / 40) * 0.98 + 0.02)
    const n = Math.floor((t - prevAddTime) * 1000)
    prevAddTime += n / 1000
    const numTries = Math.min(n, 64)
    if (t < 100) {
      for (let i = 0; i < numTries; i++) if (Math.random() < 0.16 * rnd) add(center, ballStickRatio)
    }
    stick.uniforms.brightness.value = Math.min(1, t / 4, Math.max(0, 1 + (90 - t) * 0.05))
    stick.uniforms.lighting.value = 4 * fireLighting + 0.5 * stick.uniforms.brightness.value + floorLighting * 20.0
    runningTime += dt
    update(dt)
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
  const fl = stick.uniforms.brightness.value * 0.01 + globalSparkBrightness * 0.001 * Math.sqrt(curves.activeCount) + 0.2 * fireLighting
  floorLighting = floorLighting * 0.8 + 0.2 * fl
  envObject.set(0.4, floorLighting)
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
  prevRenderedMousePos.x = mouse.x
  prevRenderedMousePos.y = mouse.y
  requestAnimationFrame(animate)
}
animate()
