import * as THREE from 'three'
import { ShaderMaterial } from 'three'
export type P3 = { x: number; y: number; z: number }
const gravityZ = -9.8
const wind = { x: 0.2, y: 0, z: 0 }

export function setWind(w: { x?: number, y?: number, z?: number }) {
  if (w.x != null) wind.x = w.x
  if (w.y != null) wind.y = w.y
  if (w.z != null) wind.z = w.z
}
export function positionAt(p: P3, v: P3, f: number, t: number) {
  const e = Math.exp(-f * t)
  return {
    x: p.x + wind.x * t - (v.x - wind.x) * (e - 1) / f,
    y: p.y + wind.y * t - (v.y - wind.y) * (e - 1) / f,
    z: p.z + (wind.z + gravityZ / f) * t - (v.z - wind.z - gravityZ / f) * (e - 1) / f
  }
}
export function velocityAt(v: P3, f: number, t: number) {
  const e = Math.exp(-f * t)
  return {
    x: wind.x + (v.x - wind.x) * e,
    y: wind.y + (v.y - wind.y) * e,
    z: wind.z + gravityZ / f + (v.z - wind.z - gravityZ / f) * e
  }
}

const vertexShader = `
uniform float ra, rb;
uniform vec3 p, v;
const vec3 gravity = vec3(0, 0, -9.8);
uniform vec3 wind;
uniform float time, friction;
uniform float brightness0, brightness1, brightness2;
varying float vBrightnessSum;
void main() {
  float t = position.z * time;
  float e = exp(-friction * t);
  vec3 wg = wind + gravity / friction;
  vec3 gpos = p + wg * t - (v - wg) * (e - 1.0) / friction;
  vec3 cpos = (viewMatrix * vec4(gpos, 1)).xyz;
  cpos += vec3(position.xy, 0) * mix(ra, rb, position.z) / cpos.z;
  gl_Position = projectionMatrix * vec4(cpos, 1);
  // (b0+b1*t+b2*tt) * ((1-t/time)/ra/ra+t/time/rb/rb)
  float sb = t * (brightness0 + t * (0.5 * brightness1 + t * brightness2 / 3.0));
  float sbt = position.z * t * (0.5 * brightness0 + t * (brightness1 / 3.0 + 0.25 * t * brightness2));
  vBrightnessSum = ((sb - sbt) / ra / ra + sbt / rb / rb);
}
`

const fragmentShader = `
varying float vBrightnessSum;
uniform vec3 color;
void main() {
  gl_FragColor.rgb = (2.0 * float(gl_FrontFacing) - 1.0) * vBrightnessSum * color * 0.0001;
  gl_FragColor.a = 1.0;
}
`

export function sphereRandom() {
  while (true) {
    const x = 2 * Math.random() - 1
    const y = 2 * Math.random() - 1
    const z = 2 * Math.random() - 1
    const r = Math.hypot(x, y, z)
    if (r < 1) return { x, y, z }
  }
}

const geometries: (THREE.BufferGeometry | undefined)[] = []
function cachedCylinderGeometry(lsec: number, rsec: number) {
  const idx = lsec * 128 + rsec
  const geometry = geometries[idx]
  if (geometry) return geometry
  return geometries[idx] = cylinderGeometry(lsec, rsec)
}

export class Curve {
  uniforms = {
    wind: { value: new THREE.Vector3() },
    p: { value: new THREE.Vector3() },
    v: { value: new THREE.Vector3() },
    color: { value: new THREE.Color() },
    brightness0: { value: 0 },
    brightness1: { value: 0 },
    brightness2: { value: 0 },
    friction: { value: 0 },
    time: { value: 0 },
    ra: { value: 0 },
    rb: { value: 0 }
  }
  readonly p: THREE.Vector3
  readonly v: THREE.Vector3
  readonly color: THREE.Color
  front = true
  brightness0 = 0
  brightness1 = 0
  brightness2 = 0
  friction = 0
  time = 0
  mesh: THREE.Mesh
  constructor() {
    this.p = this.uniforms.p.value
    this.v = this.uniforms.v.value
    this.color = this.uniforms.color.value
    this.mesh = new THREE.Mesh()
    this.mesh.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }
  update({ x, y, z }: { x: number; y: number; z: number }, focusDistance: number) {
    function r(p: P3) {
      const distance = Math.hypot(p.x - x, p.y - y, p.z - z)
      return 0.0003 + Math.abs(distance - focusDistance) * 0.015 * distance
    }
    this.front = Math.hypot(this.p.x - x, this.p.y - y, this.p.z - z) < focusDistance
    this.uniforms.wind.value.x = wind.x
    this.uniforms.wind.value.y = wind.y
    this.uniforms.wind.value.z = wind.z
    this.uniforms.ra.value = r(this.p)
    this.uniforms.rb.value = r(positionAt(this.p, this.v, this.friction, this.time))
    this.uniforms.friction.value = this.friction
    this.uniforms.time.value = this.time
    this.uniforms.brightness0.value = this.brightness0
    this.uniforms.brightness1.value = this.brightness1
    this.uniforms.brightness2.value = this.brightness2
    this.mesh.geometry = cachedCylinderGeometry(16, 12)
  }
}

export function cylinderGeometry(lsections: number, rsections: number) {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []
  const rs: [number, number][] = []
  for (let i = 0; i < rsections; i++) {
    const th = 2 * Math.PI * i / rsections
    rs.push([Math.cos(th), Math.sin(th)])
  }
  for (let i = 0; i <= lsections; i++) {
    const z = i / lsections
    rs.forEach(([cos, sin]) => positions.push(cos, sin, z))
  }
  const bottomIndex = positions.length / 3
  positions.push(0, 0, 0)
  const topIndex = positions.length / 3
  positions.push(0, 0, 1)
  for (let i = 0; i < lsections; i++) {
    const idxa = i * rsections
    const idxb = (i + 1) * rsections
    for (let j = 0; j < rsections; j++) {
      const k = (j + 1) % rsections
      indices.push(idxa + j, idxa + k, idxb + j, idxb + j, idxa + k, idxb + k)
    }
  }
  for (let j = 0; j < rsections; j++) {
    indices.push(j, bottomIndex, (j + 1) % rsections)
    const k = lsections * rsections
    indices.push(k + j, k + (j + 1) % rsections, topIndex)
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}

export class CurveManager {
  curves: Curve[] = []
  activeCount = 0
  constructor(public scene: THREE.Scene) {}
  reset() {
    for (let i = 0; i < this.activeCount; i++) {
      this.scene.remove(this.curves[i].mesh)
    }
    this.activeCount = 0
  }
  get() {
    const index = this.activeCount
    this.activeCount++
    let curve = this.curves[index]
    if (!curve) {
      curve = new Curve()
      this.curves[index] = curve
    }
    this.scene.add(curve.mesh)
    return curve
  }
  update(camera: P3, focus: P3) {
    const distance = Math.hypot(focus.x - camera.x, focus.y - camera.y, focus.z - camera.z)
    for (let i = 0; i < this.activeCount; i++) this.curves[i].update(camera, distance)
  }
  setBackVisible() {
    this.curves.forEach(c => { c.mesh.visible = !c.front })
  }
  setFrontVisible() {
    this.curves.forEach(c => { c.mesh.visible = c.front })
  }
}
