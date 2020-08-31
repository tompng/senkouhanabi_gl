import * as THREE from 'three'

const vertexShader = `

const vec3 pa = vec3(0, 0, 0);
const vec3 pb = vec3(1, 1, 1);
const vec3 da = vec3(2, 0, 0);
const vec3 db = vec3(0, 0, 2);
const float radius = 0.1;
varying vec3 vnorm, vpos;
void main(){
  float t = position.z;
  if (t < 0.0) t = t * radius / length(da);
  if (t > 1.0) t = 1.0 + (t - 1.0) * radius / length(da);
  vec3 p = mix(pb, pa, t * t * (3.0 - 2.0 * t)) + da * t * (t - 1.0) * (t - 1.0) + db * t * t * (t - 1.0);
  vec3 d = 6.0 * t * (1.0 - t) * (pa - pb) + (3.0 * t * t - 4.0 * t + 1.0) * da + t * (3.0 * t - 2.0) * db;
  vec3 view = normalize(p - cameraPosition);
  vec3 yvec = normalize(cross(view, d));
  vec3 xvec = normalize(cross(yvec, d));
  vec3 zvec = normalize(d);
  vpos = p + radius * (xvec * position.x + yvec * position.y);
  vnorm = xvec * normal.x + yvec * normal.y + zvec * normal.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(vpos, 1);
}
`

const fragmentShader = `
varying vec3 vnorm, vpos;
varying float sgn;
void main(){
  vec3 view = normalize(vpos - cameraPosition);
  vec3 norm = normalize(vnorm);
  // gl_FragColor = vec4(0.5) * dot(norm, -view);
  gl_FragColor.rgb = (gl_FrontFacing ? -1.0 : 1.0) * length(cameraPosition - vpos) * vec3(1);
  gl_FragColor.a = 1.0;
}
`

export const tubeMesh = new THREE.Mesh(
  tubeGeometry(64,20),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthTest: false
  })
)


export function tubeGeometry(lsections: number, rsections: number) {
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
  for (let i = zn - 1; i > 0; i--) {
    const th = i / zn * Math.PI / 2
    const r = Math.cos(th)
    const nz = -Math.sin(th)
    rs.forEach(([cos, sin]) => {
      positions.push(r * cos, r * sin, nz)
      normals.push(r * cos, r * sin, nz)
    })
  }
  for (let i = 0; i <= lsections; i++) {
    const z = i / lsections
    rs.forEach(([cos, sin]) => {
      normals.push(cos, sin, 0)
      positions.push(cos, sin, z)
    })
  }
  for (let i = 1; i < zn; i++) {
    const th = i / zn * Math.PI / 2
    const r = Math.cos(th)
    const nz = Math.sin(th)
    rs.forEach(([cos, sin]) => {
      positions.push(r * cos, r * sin, 1 + nz)
      normals.push(r * cos, r * sin, nz)
    })
  }
  const bottomIndex = positions.length / 3
  normals.push(0, 0, -1)
  positions.push(0, 0, -1)
  const topIndex = positions.length / 3
  normals.push(0, 0, 1)
  positions.push(0, 0, 2)
  for (let i = 0; i < lsections + 2 * zn - 2; i++) {
    const idxa = i * rsections
    const idxb = (i + 1) * rsections
    for (let j = 0; j < rsections; j++) {
      const k = (j + 1) % rsections
      indices.push(idxa + j, idxa + k, idxb + j, idxb + j, idxa + k, idxb + k)
    }
  }
  for (let j = 0; j < rsections; j++) {
    indices.push(j, bottomIndex, (j + 1) % rsections)
    const k = (lsections + 2 * zn - 2) * rsections
    indices.push(k + j, k + (j + 1) % rsections, topIndex)
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}
