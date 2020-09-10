import * as THREE from 'three'
import { SrcAlphaFactor } from 'three'


const cylinderGeometry = new THREE.CylinderBufferGeometry(1, 1, 1, 12, 128)
const vertexShader = `
varying vec3 vNormal, vPosition;
varying float alpha;
uniform vec3 windMove;
void main() {
  vec2 xy = position.xz;
  float z = 0.5 + position.y;
  float r0 = 0.0025;
  float r = r0 + 0.0 * z;
  alpha = r0 / r;
  vec2 c = 0.001 * (sin(vec2(18,17)*z)-sin(vec2(23,31)*z)+sin(vec2(35,57)*z)-sin(vec2(51,43)*z));
  vPosition = vec3(c + vec2(0.2 * z, 0)+ r * xy, z + r0) + windMove * exp(-4.0 * z);
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1);
  vNormal = normal.xzy;
}
`

const fragmentShader = `
varying vec3 vNormal, vPosition;
varying float alpha;
void main() {
  vec3 view = normalize(vPosition - cameraPosition);
  vec3 norm = normalize(vNormal);
  float c = max(0.0, dot(view, norm));
  gl_FragColor.rgb = alpha * alpha * (vec3(0.1 * c * c) + c * c * vec3(0.4,0.2,0.1) / (1.0 + 512.0 * vPosition.z * vPosition.z));
  gl_FragColor.a = 1.0;
}
`

export class Stick {
  mesh: THREE.Mesh
  constructor() {
    this.mesh = new THREE.Mesh(
      cylinderGeometry,
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false
        // blendSrc: THREE.OneFactor,
        // blendDst: THREE.OneFactor
      })
    )

  }

}