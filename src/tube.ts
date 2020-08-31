import * as THREE from 'three'

const vertexShader = `
const vec3 pa = vec3(0, 0, 0);
const vec3 pb = vec3(1, 0, 0);
const vec3 da = vec3(1, 1, 1);
const vec3 db = vec3(1, 1, 1);
const vec3 cola = vec3(1,0.5,0);
const vec3 colb = vec3(1,1,1);
const float ra = 0.1;
const float rb = 0.4;
varying vec3 vColorSum;
void main() {
  float t = position.z;
  vec3 p = mix(pa, pb, t * t * (3.0 - 2.0 * t)) + da * t * (t - 1.0) * (t - 1.0) + db * t * t * (t - 1.0);
  vec3 cpos = (viewMatrix * vec4(p, 1)).xyz;
  cpos += vec3(position.xy, 0) * mix(ra, rb, t) / cpos.z;
  vColorSum = t * (1.0 - 0.5 * t) / ra * cola + t * t * 0.5 / rb * colb;
  gl_Position = projectionMatrix * vec4(cpos, 1);
}
`

const fragmentShader = `
varying vec3 vColorSum;
void main() {
  gl_FragColor.rgb = (2.0 * float(gl_FrontFacing) - 1.0) * vColorSum;
  gl_FragColor.a = 1.0;
}
`

export const tubeMesh = new THREE.Mesh(
  cylinderGeometry(64,32),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthTest: false
  })
)

export function cylinderGeometry(lsections: number, rsections: number) {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const rs: [number, number][] = []
  const zn = Math.ceil(rsections / 2)
  for (let i = 0; i < rsections; i++) {
    const th = 2 * Math.PI * i / rsections
    rs.push([Math.cos(th), Math.sin(th)])
  }
  for (let i = 0; i <= lsections; i++) {
    const z = i / lsections
    rs.forEach(([cos, sin]) => {
      normals.push(cos, sin, 0)
      positions.push(cos, sin, z)
    })
  }
  const bottomIndex = positions.length / 3
  normals.push(0, 0, -1)
  positions.push(0, 0, 0)
  const topIndex = positions.length / 3
  normals.push(0, 0, 1)
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
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}
