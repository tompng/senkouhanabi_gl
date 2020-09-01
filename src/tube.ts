import * as THREE from 'three'
import { ShaderMaterial } from 'three'

const vertexShader = `
uniform vec3 pa, pb, da, db, cola, colb;
uniform float ra, rb;
varying vec3 vColorSum;
void main() {
  float t = position.z;
  vec3 p = mix(pa, pb, t * t * (3.0 - 2.0 * t)) + da * t * (t - 1.0) * (t - 1.0) + db * t * t * (t - 1.0);
  vec3 cpos = (viewMatrix * vec4(p, 1)).xyz;
  cpos += vec3(position.xy, 0) * mix(ra, rb, t) / cpos.z;
  vColorSum = t * (1.0 - 0.5 * t) / ra / ra * cola + t * t * 0.5 / rb / rb * colb;
  gl_Position = projectionMatrix * vec4(cpos, 1);
}
`

const fragmentShader = `
varying vec3 vColorSum;
void main() {
  gl_FragColor.rgb = (2.0 * float(gl_FrontFacing) - 1.0) * vColorSum * 0.05;
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
    pa: { value: new THREE.Vector3() },
    pb: { value: new THREE.Vector3() },
    da: { value: new THREE.Vector3() },
    db: { value: new THREE.Vector3() },
    cola: { value: new THREE.Color() },
    colb: { value: new THREE.Color() },
    ra: { value: 0 },
    rb: { value: 0 }
  }
  readonly pa: THREE.Vector3
  readonly pb: THREE.Vector3
  readonly da: THREE.Vector3
  readonly db: THREE.Vector3
  readonly cola: THREE.Color
  readonly colb: THREE.Color
  mesh: THREE.Mesh
  constructor() {
    this.pa = this.uniforms.pa.value
    this.pb = this.uniforms.pb.value
    this.da = this.uniforms.da.value
    this.db = this.uniforms.db.value
    this.cola = this.uniforms.cola.value
    this.colb = this.uniforms.colb.value
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
  update({ x, y, z }: { x: number; y: number; z: number }) {
    function r(p: THREE.Vector3) {
      const distance = Math.hypot(p.x - x, p.y - y, p.z - z)
      return 0.015 + Math.abs(distance - 3) * 0.01 * distance
    }
    this.uniforms.ra.value = r(this.pa)
    this.uniforms.rb.value = r(this.pb)
    this.mesh.geometry = cachedCylinderGeometry(32, 16)
  }
}

export function generateRandomCurve() {
  const curve = new Curve()
  const p = sphereRandom()
  const p2 = sphereRandom()
  const p3 = sphereRandom()
  const a = 0.2 + 1.8 * Math.random()
  curve.pa.x = p.x * a
  curve.pa.y = p.y * a
  curve.pa.z = p.z * a
  curve.pb.x = p.x * (1 + a)
  curve.pb.y = p.y * (1 + a)
  curve.pb.z = p.z * (1 + a)
  curve.da.x = p.x + p2.x * 0.8
  curve.da.y = p.y + p2.y * 0.8
  curve.da.z = p.z + p2.z * 0.8
  curve.db.x = p.x + p3.x * 0.8
  curve.db.y = p.y + p3.y * 0.8
  curve.db.z = p.z + p3.z * 0.8
  curve.cola.setRGB(0.8, 0.4, 0.2)
  curve.colb.setRGB(0.4, 0.2, 0.1)
  return curve
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
  update(cameraPosition: { x: number; y: number; z: number }) {
    for (let i = 0; i < this.activeCount; i++) this.curves[i].update(cameraPosition)
  }
}
