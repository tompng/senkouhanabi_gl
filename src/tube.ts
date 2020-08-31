import * as THREE from 'three'

const vertexShader = `
uniform vec3 pa;// = vec3(0, 0, 0);
uniform vec3 pb;// = vec3(1, 0, 0);
uniform vec3 da;// = vec3(1, 1, 1);
uniform vec3 db;// = vec3(1, 1, 1);
uniform vec3 cola;// = vec3(1,0.5,0);
uniform vec3 colb;// = vec3(1,1,1);
uniform float ra;// = 0.1;
uniform float rb;// = 0.4;
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

function sphereRandom() {
  while (true) {
    const x = 2 * Math.random() - 1
    const y = 2 * Math.random() - 1
    const z = 2 * Math.random() - 1
    const r = Math.hypot(x, y, z)
    if (r < 1) return { x, y, z }
  }
}

const geometry = cylinderGeometry(32, 16)
export function generateRandomTubeMesh() {
  const uniforms = {
    pa: { value: new THREE.Vector3(0, 0, 0) },
    pb: { value: new THREE.Vector3(1, 0, 0) },
    da: { value: new THREE.Vector3(1, 1, 1) },
    db: { value: new THREE.Vector3(1, 1, 1) },
    cola: { value: new THREE.Color(0) },
    colb: { value: new THREE.Color(0xff8040) },
    ra: { value: 0.02 },
    rb: { value: 0.04 },
  }
  const p = sphereRandom()
  const p2 = sphereRandom()
  const p3 = sphereRandom()
  const a = 0.2 + 1.8 * Math.random()
  uniforms.pa.value.x = p.x * a
  uniforms.pa.value.y = p.y * a
  uniforms.pa.value.z = p.z * a
  uniforms.pb.value.x = p.x * (1 + a)
  uniforms.pb.value.y = p.y * (1 + a)
  uniforms.pb.value.z = p.z * (1 + a)
  uniforms.da.value.x = p.x + p2.x * 0.8
  uniforms.da.value.y = p.y + p2.y * 0.8
  uniforms.da.value.z = p.z + p2.z * 0.8
  uniforms.db.value.x = p.x + p3.x * 0.8
  uniforms.db.value.y = p.y + p3.y * 0.8
  uniforms.db.value.z = p.z + p3.z * 0.8
  function update(camera: THREE.Camera) {
    function r(p: THREE.Vector3) {
      const distance = Math.hypot(p.x - camera.position.x, p.y - camera.position.y, p.z - camera.position.z)
      return 0.02 + Math.abs(distance - 3) * 0.01 * distance
    }
    uniforms.ra.value = r(uniforms.pa.value)
    uniforms.rb.value = r(uniforms.pb.value)
  }
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  )
  return { update, mesh }
}

export const tubeMesh = generateRandomTubeMesh()

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
